-- Phase 4: Database Partitioning Setup
-- Create partitioned archive tables for high-volume data

-- 1. Create archive schema for partitioned data
CREATE SCHEMA IF NOT EXISTS archive;

-- 2. Create partitioned api_call_logs archive table (by month)
CREATE TABLE archive.api_call_logs_archive (
  id UUID NOT NULL,
  user_id UUID NOT NULL,
  service_name TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  http_method TEXT DEFAULT 'POST',
  request_payload JSONB NOT NULL,
  response_payload JSONB,
  response_status_code INTEGER,
  latency_ms INTEGER,
  is_error BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create partitions for the last 12 months and next 3 months
CREATE TABLE archive.api_call_logs_2024_10 PARTITION OF archive.api_call_logs_archive
  FOR VALUES FROM ('2024-10-01') TO ('2024-11-01');
CREATE TABLE archive.api_call_logs_2024_11 PARTITION OF archive.api_call_logs_archive
  FOR VALUES FROM ('2024-11-01') TO ('2024-12-01');
CREATE TABLE archive.api_call_logs_2024_12 PARTITION OF archive.api_call_logs_archive
  FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');
CREATE TABLE archive.api_call_logs_2025_01 PARTITION OF archive.api_call_logs_archive
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE archive.api_call_logs_2025_02 PARTITION OF archive.api_call_logs_archive
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE archive.api_call_logs_2025_03 PARTITION OF archive.api_call_logs_archive
  FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');

-- 3. Create partitioned audit_logs archive table (by month)
CREATE TABLE archive.audit_logs_archive (
  id UUID NOT NULL,
  user_id UUID,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create partitions for audit logs
CREATE TABLE archive.audit_logs_2024_10 PARTITION OF archive.audit_logs_archive
  FOR VALUES FROM ('2024-10-01') TO ('2024-11-01');
CREATE TABLE archive.audit_logs_2024_11 PARTITION OF archive.audit_logs_archive
  FOR VALUES FROM ('2024-11-01') TO ('2024-12-01');
CREATE TABLE archive.audit_logs_2024_12 PARTITION OF archive.audit_logs_archive
  FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');
CREATE TABLE archive.audit_logs_2025_01 PARTITION OF archive.audit_logs_archive
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE archive.audit_logs_2025_02 PARTITION OF archive.audit_logs_archive
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE archive.audit_logs_2025_03 PARTITION OF archive.audit_logs_archive
  FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');

-- 4. Create partitioned generations archive table (by month)
CREATE TABLE archive.generations_archive (
  id UUID NOT NULL,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  prompt TEXT NOT NULL,
  status TEXT NOT NULL,
  tokens_used INTEGER NOT NULL,
  model_id TEXT,
  output_url TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create partitions for generations
CREATE TABLE archive.generations_2024_10 PARTITION OF archive.generations_archive
  FOR VALUES FROM ('2024-10-01') TO ('2024-11-01');
CREATE TABLE archive.generations_2024_11 PARTITION OF archive.generations_archive
  FOR VALUES FROM ('2024-11-01') TO ('2024-12-01');
CREATE TABLE archive.generations_2024_12 PARTITION OF archive.generations_archive
  FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');
CREATE TABLE archive.generations_2025_01 PARTITION OF archive.generations_archive
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE archive.generations_2025_02 PARTITION OF archive.generations_archive
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE archive.generations_2025_03 PARTITION OF archive.generations_archive
  FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');

-- 5. Create indexes on archive tables
CREATE INDEX idx_api_call_logs_archive_user ON archive.api_call_logs_archive(user_id);
CREATE INDEX idx_api_call_logs_archive_service ON archive.api_call_logs_archive(service_name);
CREATE INDEX idx_audit_logs_archive_user ON archive.audit_logs_archive(user_id);
CREATE INDEX idx_audit_logs_archive_action ON archive.audit_logs_archive(action);
CREATE INDEX idx_generations_archive_user ON archive.generations_archive(user_id);
CREATE INDEX idx_generations_archive_type ON archive.generations_archive(type);

-- 6. Function to automatically create new monthly partitions
CREATE OR REPLACE FUNCTION archive.create_monthly_partitions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'archive', 'public'
AS $$
DECLARE
  partition_date DATE;
  partition_name TEXT;
  start_date DATE;
  end_date DATE;
BEGIN
  -- Create partitions for the next 3 months
  FOR i IN 0..2 LOOP
    partition_date := date_trunc('month', NOW() + (i || ' months')::INTERVAL);
    start_date := partition_date;
    end_date := partition_date + '1 month'::INTERVAL;
    
    -- API call logs partition
    partition_name := 'api_call_logs_' || to_char(partition_date, 'YYYY_MM');
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'archive' AND tablename = partition_name) THEN
      EXECUTE format(
        'CREATE TABLE archive.%I PARTITION OF archive.api_call_logs_archive FOR VALUES FROM (%L) TO (%L)',
        partition_name, start_date, end_date
      );
    END IF;
    
    -- Audit logs partition
    partition_name := 'audit_logs_' || to_char(partition_date, 'YYYY_MM');
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'archive' AND tablename = partition_name) THEN
      EXECUTE format(
        'CREATE TABLE archive.%I PARTITION OF archive.audit_logs_archive FOR VALUES FROM (%L) TO (%L)',
        partition_name, start_date, end_date
      );
    END IF;
    
    -- Generations partition
    partition_name := 'generations_' || to_char(partition_date, 'YYYY_MM');
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'archive' AND tablename = partition_name) THEN
      EXECUTE format(
        'CREATE TABLE archive.%I PARTITION OF archive.generations_archive FOR VALUES FROM (%L) TO (%L)',
        partition_name, start_date, end_date
      );
    END IF;
  END LOOP;
END;
$$;

-- 7. Phase 5: Data Archival Functions

-- Archive old API call logs (older than 30 days)
CREATE OR REPLACE FUNCTION archive.archive_api_call_logs(retention_days INTEGER DEFAULT 30)
RETURNS TABLE(archived_count INTEGER, deleted_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'archive', 'public'
AS $$
DECLARE
  v_archived INTEGER := 0;
  v_deleted INTEGER := 0;
  cutoff_date TIMESTAMPTZ;
BEGIN
  cutoff_date := NOW() - (retention_days || ' days')::INTERVAL;
  
  -- Insert into archive
  INSERT INTO archive.api_call_logs_archive (
    id, user_id, service_name, endpoint, http_method,
    request_payload, response_payload, response_status_code,
    latency_ms, is_error, error_message, created_at
  )
  SELECT 
    id, user_id, service_name, endpoint, http_method,
    request_payload, response_payload, response_status_code,
    latency_ms, is_error, error_message, created_at
  FROM public.api_call_logs
  WHERE created_at < cutoff_date;
  
  GET DIAGNOSTICS v_archived = ROW_COUNT;
  
  -- Delete from main table
  DELETE FROM public.api_call_logs
  WHERE created_at < cutoff_date;
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  
  RETURN QUERY SELECT v_archived, v_deleted;
END;
$$;

-- Archive old audit logs (older than 90 days)
CREATE OR REPLACE FUNCTION archive.archive_audit_logs(retention_days INTEGER DEFAULT 90)
RETURNS TABLE(archived_count INTEGER, deleted_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'archive', 'public'
AS $$
DECLARE
  v_archived INTEGER := 0;
  v_deleted INTEGER := 0;
  cutoff_date TIMESTAMPTZ;
BEGIN
  cutoff_date := NOW() - (retention_days || ' days')::INTERVAL;
  
  -- Insert into archive
  INSERT INTO archive.audit_logs_archive (
    id, user_id, action, resource_type, resource_id,
    metadata, ip_address, user_agent, created_at
  )
  SELECT 
    id, user_id, action, resource_type, resource_id,
    metadata, ip_address, user_agent, created_at
  FROM public.audit_logs
  WHERE created_at < cutoff_date;
  
  GET DIAGNOSTICS v_archived = ROW_COUNT;
  
  -- Delete from main table
  DELETE FROM public.audit_logs
  WHERE created_at < cutoff_date;
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  
  RETURN QUERY SELECT v_archived, v_deleted;
END;
$$;

-- Archive old completed generations (older than 180 days)
CREATE OR REPLACE FUNCTION archive.archive_generations(retention_days INTEGER DEFAULT 180)
RETURNS TABLE(archived_count INTEGER, deleted_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'archive', 'public'
AS $$
DECLARE
  v_archived INTEGER := 0;
  v_deleted INTEGER := 0;
  cutoff_date TIMESTAMPTZ;
BEGIN
  cutoff_date := NOW() - (retention_days || ' days')::INTERVAL;
  
  -- Only archive completed generations
  INSERT INTO archive.generations_archive (
    id, user_id, type, prompt, status, tokens_used,
    model_id, output_url, created_at, completed_at
  )
  SELECT 
    id, user_id, type, prompt, status, tokens_used,
    model_id, output_url, created_at, completed_at
  FROM public.generations
  WHERE created_at < cutoff_date
    AND status IN ('completed', 'COMPLETED', 'failed', 'FAILED');
  
  GET DIAGNOSTICS v_archived = ROW_COUNT;
  
  -- Delete from main table (only archived records)
  DELETE FROM public.generations
  WHERE created_at < cutoff_date
    AND status IN ('completed', 'COMPLETED', 'failed', 'FAILED');
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  
  RETURN QUERY SELECT v_archived, v_deleted;
END;
$$;

-- Master archival function that runs all archivals
CREATE OR REPLACE FUNCTION archive.run_all_archivals()
RETURNS TABLE(
  table_name TEXT,
  archived_count INTEGER,
  deleted_count INTEGER,
  run_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'archive', 'public'
AS $$
DECLARE
  api_result RECORD;
  audit_result RECORD;
  gen_result RECORD;
BEGIN
  -- Ensure partitions exist for upcoming months
  PERFORM archive.create_monthly_partitions();
  
  -- Run individual archivals
  SELECT * INTO api_result FROM archive.archive_api_call_logs(30);
  SELECT * INTO audit_result FROM archive.archive_audit_logs(90);
  SELECT * INTO gen_result FROM archive.archive_generations(180);
  
  -- Return results
  RETURN QUERY VALUES
    ('api_call_logs'::TEXT, api_result.archived_count, api_result.deleted_count, NOW()),
    ('audit_logs'::TEXT, audit_result.archived_count, audit_result.deleted_count, NOW()),
    ('generations'::TEXT, gen_result.archived_count, gen_result.deleted_count, NOW());
END;
$$;

-- 8. Create archival run history table
CREATE TABLE IF NOT EXISTS archive.archival_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  archived_count INTEGER NOT NULL DEFAULT 0,
  deleted_count INTEGER NOT NULL DEFAULT 0,
  run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_ms INTEGER,
  error_message TEXT
);

-- 9. Function to run archival with logging
CREATE OR REPLACE FUNCTION archive.run_scheduled_archival()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'archive', 'public'
AS $$
DECLARE
  result RECORD;
  start_time TIMESTAMPTZ;
  duration INTEGER;
BEGIN
  start_time := clock_timestamp();
  
  FOR result IN SELECT * FROM archive.run_all_archivals() LOOP
    duration := EXTRACT(MILLISECONDS FROM clock_timestamp() - start_time)::INTEGER;
    
    INSERT INTO archive.archival_runs (table_name, archived_count, deleted_count, duration_ms)
    VALUES (result.table_name, result.archived_count, result.deleted_count, duration);
  END LOOP;
  
EXCEPTION WHEN OTHERS THEN
  INSERT INTO archive.archival_runs (table_name, archived_count, deleted_count, error_message)
  VALUES ('ERROR', 0, 0, SQLERRM);
END;
$$;

-- 10. Drop old partitions (older than 12 months)
CREATE OR REPLACE FUNCTION archive.drop_old_partitions(months_to_keep INTEGER DEFAULT 12)
RETURNS TABLE(dropped_partition TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'archive'
AS $$
DECLARE
  partition_record RECORD;
  cutoff_date DATE;
  partition_date DATE;
BEGIN
  cutoff_date := date_trunc('month', NOW() - (months_to_keep || ' months')::INTERVAL);
  
  FOR partition_record IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'archive' 
      AND (tablename LIKE 'api_call_logs_20%' 
           OR tablename LIKE 'audit_logs_20%' 
           OR tablename LIKE 'generations_20%')
  LOOP
    -- Extract date from partition name (format: table_YYYY_MM)
    partition_date := to_date(
      regexp_replace(partition_record.tablename, '^[a-z_]+_', ''),
      'YYYY_MM'
    );
    
    IF partition_date < cutoff_date THEN
      EXECUTE format('DROP TABLE IF EXISTS archive.%I', partition_record.tablename);
      RETURN QUERY SELECT partition_record.tablename::TEXT;
    END IF;
  END LOOP;
END;
$$;