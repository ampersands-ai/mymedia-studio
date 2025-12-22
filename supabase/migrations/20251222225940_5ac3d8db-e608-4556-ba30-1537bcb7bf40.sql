-- =====================================================
-- PHASE 2: Search, Collections, and Prompt Templates
-- =====================================================

-- 1. Full-text search index for prompt search
CREATE INDEX IF NOT EXISTS idx_generations_prompt_fts 
ON public.generations 
USING gin(to_tsvector('english', COALESCE(prompt, '')));

-- =====================================================
-- 2. Asset Collections Tables
-- =====================================================

-- Collections table
CREATE TABLE public.asset_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#6366f1',
  icon VARCHAR(50) DEFAULT 'folder',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Collection items junction table
CREATE TABLE public.collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES asset_collections(id) ON DELETE CASCADE,
  generation_id UUID NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  UNIQUE(collection_id, generation_id)
);

-- Indexes for collections
CREATE INDEX idx_collections_user ON asset_collections(user_id);
CREATE INDEX idx_collection_items_collection ON collection_items(collection_id);
CREATE INDEX idx_collection_items_generation ON collection_items(generation_id);

-- RLS for collections
ALTER TABLE asset_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own collections" ON asset_collections
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own collections" ON asset_collections
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own collections" ON asset_collections
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own collections" ON asset_collections
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- RLS for collection items
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view items in own collections" ON collection_items
  FOR SELECT TO authenticated
  USING (collection_id IN (SELECT id FROM asset_collections WHERE user_id = auth.uid()));

CREATE POLICY "Users can add items to own collections" ON collection_items
  FOR INSERT TO authenticated
  WITH CHECK (collection_id IN (SELECT id FROM asset_collections WHERE user_id = auth.uid()));

CREATE POLICY "Users can update items in own collections" ON collection_items
  FOR UPDATE TO authenticated
  USING (collection_id IN (SELECT id FROM asset_collections WHERE user_id = auth.uid()));

CREATE POLICY "Users can remove items from own collections" ON collection_items
  FOR DELETE TO authenticated
  USING (collection_id IN (SELECT id FROM asset_collections WHERE user_id = auth.uid()));

-- Auto-create Favorites collection for new users
CREATE OR REPLACE FUNCTION public.create_default_collection()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.asset_collections (user_id, name, icon, is_default)
  VALUES (NEW.id, 'Favorites', 'heart', true)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_profile_created_collection
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_default_collection();

-- Update timestamp trigger for collections
CREATE TRIGGER update_asset_collections_updated_at
  BEFORE UPDATE ON public.asset_collections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =====================================================
-- 3. Prompt Templates Enhancement
-- =====================================================

-- Add tags, use_count, title, model_type to cinematic_prompts
ALTER TABLE public.cinematic_prompts
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS use_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS title VARCHAR(150),
  ADD COLUMN IF NOT EXISTS model_type VARCHAR(50) DEFAULT 'any';

-- User saved prompts table
CREATE TABLE public.user_saved_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title VARCHAR(100) NOT NULL,
  prompt TEXT NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'custom',
  tags TEXT[] DEFAULT '{}',
  source_generation_id UUID REFERENCES generations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for user saved prompts
CREATE INDEX idx_user_prompts_user ON user_saved_prompts(user_id);
CREATE INDEX idx_user_prompts_category ON user_saved_prompts(category);
CREATE INDEX idx_cinematic_prompts_tags ON cinematic_prompts USING gin(tags);

-- RLS for user saved prompts
ALTER TABLE user_saved_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own prompts" ON user_saved_prompts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own prompts" ON user_saved_prompts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own prompts" ON user_saved_prompts
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own prompts" ON user_saved_prompts
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Update timestamp trigger for user prompts
CREATE TRIGGER update_user_saved_prompts_updated_at
  BEFORE UPDATE ON public.user_saved_prompts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Function to increment prompt use count
CREATE OR REPLACE FUNCTION public.increment_prompt_use_count(prompt_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.cinematic_prompts
  SET use_count = COALESCE(use_count, 0) + 1
  WHERE id = prompt_id;
END;
$$;