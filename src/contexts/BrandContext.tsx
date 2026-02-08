import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  type BrandConfig,
  defaultBrand,
  detectBrandMode,
  extractSlugFromHostname,
  brandConfigFromRow,
  _setBrand,
} from '@/config/brand';
import { logger } from '@/lib/logger';

// 'brands' table exists in DB but not yet in auto-generated Supabase types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const brandsTable = () => (supabase as any).from('brands');

// ─── Context ──────────────────────────────────────────────────────────

interface BrandContextValue {
  brand: BrandConfig;
  isLoading: boolean;
  mode: 'platform' | 'custom';
}

const BrandContext = createContext<BrandContextValue>({
  brand: defaultBrand,
  isLoading: false,
  mode: 'custom',
});

// ─── Hook ─────────────────────────────────────────────────────────────

export function useBrand(): BrandConfig {
  return useContext(BrandContext).brand;
}

export function useBrandContext(): BrandContextValue {
  return useContext(BrandContext);
}

// ─── Provider ─────────────────────────────────────────────────────────

interface BrandProviderProps {
  children: ReactNode;
}

export function BrandProvider({ children }: BrandProviderProps) {
  const [brandConfig, setBrandConfig] = useState<BrandConfig>(defaultBrand);
  const [isLoading, setIsLoading] = useState(false);
  const [mode] = useState<'platform' | 'custom'>(() => detectBrandMode());

  useEffect(() => {
    if (mode === 'custom') {
      // Custom domain mode: use env-based config (already set as default)
      _setBrand(defaultBrand);
      return;
    }

    // Platform mode: resolve brand from subdomain
    const slug = extractSlugFromHostname();
    if (!slug) {
      logger.warn('Platform mode detected but no slug found in hostname', {
        component: 'BrandProvider',
        hostname: window.location.hostname,
      });
      return;
    }

    setIsLoading(true);

    const resolveBrand = async () => {
      try {
        const { data, error } = await brandsTable()
          .select('*')
          .eq('slug', slug)
          .eq('is_active', true)
          .single();

        if (error || !data) {
          logger.error('Failed to resolve brand', error ? new Error(error.message) : new Error('Brand not found'), {
            component: 'BrandProvider',
            slug,
          });
          // Fall back to default brand
          return;
        }

        const resolved = brandConfigFromRow(data);
        setBrandConfig(resolved);
        _setBrand(resolved);

        // Apply dynamic favicon if set
        if (resolved.faviconPath) {
          const link = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
          if (link) link.href = resolved.faviconPath;
        }

        // Apply dynamic title
        document.title = resolved.seo.defaultTitle;

        logger.info('Brand resolved from database', {
          component: 'BrandProvider',
          slug: resolved.slug,
          name: resolved.name,
          mode: 'platform',
        });
      } catch (err) {
        logger.error('Brand resolution error', err instanceof Error ? err : new Error(String(err)), {
          component: 'BrandProvider',
          slug,
        });
      } finally {
        setIsLoading(false);
      }
    };

    resolveBrand();
  }, [mode]);

  // Also try custom domain resolution if in custom mode but hostname doesn't match env
  useEffect(() => {
    if (mode !== 'custom') return;

    const hostname = window.location.hostname;
    const envDomain = defaultBrand.domain;

    // If on localhost or the domain matches env, skip DB lookup
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === envDomain ||
      hostname === `www.${envDomain}`
    ) {
      return;
    }

    // Custom domain that doesn't match env → try resolving from DB
    setIsLoading(true);

    const resolveCustomDomain = async () => {
      try {
        const { data, error } = await brandsTable()
          .select('*')
          .eq('custom_domain', hostname)
          .eq('is_active', true)
          .single();

        if (error || !data) {
          // Not found is normal for first-time setups
          return;
        }

        const resolved = brandConfigFromRow(data);
        setBrandConfig(resolved);
        _setBrand(resolved);

        if (resolved.faviconPath) {
          const link = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
          if (link) link.href = resolved.faviconPath;
        }

        document.title = resolved.seo.defaultTitle;

        logger.info('Brand resolved from custom domain', {
          component: 'BrandProvider',
          domain: hostname,
          name: resolved.name,
          mode: 'custom',
        });
      } catch (err) {
        logger.error('Custom domain resolution error', err instanceof Error ? err : new Error(String(err)), {
          component: 'BrandProvider',
          hostname,
        });
      } finally {
        setIsLoading(false);
      }
    };

    resolveCustomDomain();
  }, [mode]);

  return (
    <BrandContext.Provider value={{ brand: brandConfig, isLoading, mode }}>
      {children}
    </BrandContext.Provider>
  );
}
