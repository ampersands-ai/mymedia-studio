-- White-Label Brands Table
-- Supports two deployment modes:
--   1. Platform mode: mybrand.mymedia.studio (subdomain-based, multi-tenant)
--   2. Custom domain mode: mybrand.com (standalone deployment)
--
-- In platform mode, the brand is resolved from the subdomain at runtime.
-- In custom domain mode, the brand is resolved from the custom_domain column.

CREATE TABLE IF NOT EXISTS public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ─── Tenant Identification ──────────────────────────────────────────
  slug TEXT NOT NULL UNIQUE,                          -- e.g. "mybrand" (used as subdomain: mybrand.mymedia.studio)
  custom_domain TEXT UNIQUE,                          -- e.g. "mybrand.com" (optional, for custom domain mode)

  -- ─── Identity ───────────────────────────────────────────────────────
  name TEXT NOT NULL,                                 -- Display name: "MyBrand"
  tagline TEXT DEFAULT 'AI content creation platform',
  description TEXT DEFAULT 'Professional AI-powered platform for creating videos, images, music, and more.',

  -- ─── Assets ─────────────────────────────────────────────────────────
  logo_url TEXT,                                      -- Full URL or path to logo
  favicon_url TEXT,                                   -- Full URL or path to favicon
  og_image_url TEXT,                                  -- Open Graph image URL

  -- ─── Contact ────────────────────────────────────────────────────────
  support_email TEXT,
  privacy_email TEXT,
  alerts_email TEXT,
  noreply_email TEXT,

  -- ─── Social Links ──────────────────────────────────────────────────
  social_links JSONB DEFAULT '{}'::jsonb,
  -- Expected shape: { twitter, twitterHandle, linkedin, youtube, instagram, facebook }

  -- ─── Theme Overrides ───────────────────────────────────────────────
  theme JSONB DEFAULT '{}'::jsonb,
  -- Expected shape: { primaryColor, accentColor, fontFamily, ... }

  -- ─── Feature Flags / Limits ─────────────────────────────────────────
  settings JSONB DEFAULT '{}'::jsonb,
  -- Expected shape: { freeCredits, maxUploads, enabledModels[], ... }

  -- ─── Ownership ──────────────────────────────────────────────────────
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- ─── Timestamps ─────────────────────────────────────────────────────
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast lookup by subdomain and custom domain
CREATE INDEX IF NOT EXISTS idx_brands_slug ON public.brands(slug);
CREATE INDEX IF NOT EXISTS idx_brands_custom_domain ON public.brands(custom_domain) WHERE custom_domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_brands_owner ON public.brands(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_brands_active ON public.brands(is_active) WHERE is_active = true;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_brands_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER brands_updated_at
  BEFORE UPDATE ON public.brands
  FOR EACH ROW
  EXECUTE FUNCTION public.update_brands_updated_at();

-- ─── Brand Members (links users to brands) ──────────────────────────────
-- In platform mode, a user can belong to one or more brands.
-- The role determines what they can do within that brand's scope.

CREATE TYPE public.brand_role AS ENUM ('owner', 'admin', 'member');

CREATE TABLE IF NOT EXISTS public.brand_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role brand_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (brand_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_brand_members_user ON public.brand_members(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_members_brand ON public.brand_members(brand_id);

-- ─── Brand Domains (for custom domain verification) ────────────────────
-- Tracks custom domain verification status for brands that want mybrand.com

CREATE TABLE IF NOT EXISTS public.brand_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  domain TEXT NOT NULL UNIQUE,
  verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'failed')),
  verification_token TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brand_domains_domain ON public.brand_domains(domain);
CREATE INDEX IF NOT EXISTS idx_brand_domains_brand ON public.brand_domains(brand_id);

-- ─── Row Level Security ───────────────────────────────────────────────
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_domains ENABLE ROW LEVEL SECURITY;

-- Public: anyone can read active brands (needed for subdomain/domain resolution)
CREATE POLICY "brands_public_read"
  ON public.brands FOR SELECT
  USING (is_active = true);

-- Owner/admin can update their brand
CREATE POLICY "brands_owner_update"
  ON public.brands FOR UPDATE
  USING (
    owner_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.brand_members
      WHERE brand_members.brand_id = brands.id
        AND brand_members.user_id = auth.uid()
        AND brand_members.role IN ('owner', 'admin')
    )
  );

-- Members: users can see their own memberships
CREATE POLICY "brand_members_own_read"
  ON public.brand_members FOR SELECT
  USING (user_id = auth.uid());

-- Brand owners/admins can manage members
CREATE POLICY "brand_members_admin_all"
  ON public.brand_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.brand_members bm
      WHERE bm.brand_id = brand_members.brand_id
        AND bm.user_id = auth.uid()
        AND bm.role IN ('owner', 'admin')
    )
  );

-- Brand domains: same as brand update policy
CREATE POLICY "brand_domains_admin_all"
  ON public.brand_domains FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.brand_members bm
      WHERE bm.brand_id = brand_domains.brand_id
        AND bm.user_id = auth.uid()
        AND bm.role IN ('owner', 'admin')
    )
  );

-- Brand domains: public read for verified domains (needed for resolution)
CREATE POLICY "brand_domains_public_read"
  ON public.brand_domains FOR SELECT
  USING (verification_status = 'verified');

-- ─── Helper function: resolve brand from hostname ─────────────────────
-- Used by edge functions to resolve which brand a request belongs to.
-- Handles both subdomain (slug.mymedia.studio) and custom domain (mybrand.com).

CREATE OR REPLACE FUNCTION public.resolve_brand(request_hostname TEXT)
RETURNS UUID AS $$
DECLARE
  brand_id UUID;
  platform_domain TEXT;
  subdomain TEXT;
BEGIN
  -- Get the platform base domain from app settings (e.g. "mymedia.studio")
  platform_domain := current_setting('app.settings.platform_domain', true);
  IF platform_domain IS NULL OR platform_domain = '' THEN
    platform_domain := 'mymedia.studio';
  END IF;

  -- 1. Try exact custom domain match first
  SELECT b.id INTO brand_id
  FROM public.brands b
  JOIN public.brand_domains bd ON bd.brand_id = b.id
  WHERE bd.domain = request_hostname
    AND bd.verification_status = 'verified'
    AND b.is_active = true
  LIMIT 1;

  IF brand_id IS NOT NULL THEN
    RETURN brand_id;
  END IF;

  -- 2. Also check brands.custom_domain directly
  SELECT b.id INTO brand_id
  FROM public.brands b
  WHERE b.custom_domain = request_hostname
    AND b.is_active = true
  LIMIT 1;

  IF brand_id IS NOT NULL THEN
    RETURN brand_id;
  END IF;

  -- 3. Try subdomain extraction (e.g. "mybrand.mymedia.studio" -> "mybrand")
  IF request_hostname LIKE '%.' || platform_domain THEN
    subdomain := split_part(request_hostname, '.', 1);
    SELECT b.id INTO brand_id
    FROM public.brands b
    WHERE b.slug = subdomain
      AND b.is_active = true
    LIMIT 1;
  END IF;

  RETURN brand_id; -- NULL if not found
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- ─── Seed default brand ────────────────────────────────────────────────
-- This creates the default platform brand so the system works out of the box.
INSERT INTO public.brands (slug, name, tagline, description, support_email, privacy_email, is_active)
VALUES (
  'default',
  'artifio.ai',
  'All-in-one AI content platform for creators',
  'Professional AI-powered platform for creating videos, images, music, and more.',
  'support@artifio.ai',
  'privacy@artifio.ai',
  true
)
ON CONFLICT (slug) DO NOTHING;
