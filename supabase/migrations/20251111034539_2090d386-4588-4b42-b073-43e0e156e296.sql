-- Enable Realtime for workflow_executions table
ALTER PUBLICATION supabase_realtime ADD TABLE workflow_executions;

-- Ensure the table has proper replica identity for realtime updates
ALTER TABLE workflow_executions REPLICA IDENTITY FULL;