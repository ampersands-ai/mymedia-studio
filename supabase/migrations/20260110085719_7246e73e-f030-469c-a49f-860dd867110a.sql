-- Create prerender_cache table for storing pre-rendered HTML
CREATE TABLE public.prerender_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url_path TEXT NOT NULL,
  rendered_html TEXT NOT NULL,
  content_hash TEXT,
  rendered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
  render_time_ms INTEGER,
  html_size_bytes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique index on url_path for fast lookups
CREATE UNIQUE INDEX idx_prerender_cache_url_path ON public.prerender_cache(url_path);

-- Create index on expires_at for cleanup queries
CREATE INDEX idx_prerender_cache_expires_at ON public.prerender_cache(expires_at);

-- Enable RLS
ALTER TABLE public.prerender_cache ENABLE ROW LEVEL SECURITY;

-- Allow edge functions to read/write (using service role)
-- No user-facing policies needed as this is internal caching

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_prerender_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_prerender_cache_timestamp
BEFORE UPDATE ON public.prerender_cache
FOR EACH ROW
EXECUTE FUNCTION public.update_prerender_cache_updated_at();

-- Create function to clean up expired cache entries
CREATE OR REPLACE FUNCTION public.cleanup_expired_prerender_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.prerender_cache
  WHERE expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add comment for documentation
COMMENT ON TABLE public.prerender_cache IS 'Stores pre-rendered HTML pages for SEO/crawler optimization';