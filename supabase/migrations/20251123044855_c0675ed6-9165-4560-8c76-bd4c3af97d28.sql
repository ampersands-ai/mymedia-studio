-- Phase 1: Drop orphaned database tables that reference deleted ai_models table
-- These tables are non-functional since ai_models was removed

DROP TABLE IF EXISTS model_test_results CASCADE;
DROP TABLE IF EXISTS model_test_configs CASCADE;
DROP TABLE IF EXISTS model_test_schedules CASCADE;
DROP TABLE IF EXISTS model_alert_history CASCADE;
DROP TABLE IF EXISTS model_alert_configs CASCADE;
DROP TABLE IF EXISTS model_documentation CASCADE;