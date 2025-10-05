-- Re-enable all Kie.ai models
UPDATE ai_models 
SET is_active = true 
WHERE provider = 'kie_ai';