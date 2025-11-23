-- Drop broken model_health_summary view that references deleted ai_models table
-- ADR 007: Model metadata moved to file-based registry, ai_models table no longer exists
DROP VIEW IF EXISTS public.model_health_summary;
