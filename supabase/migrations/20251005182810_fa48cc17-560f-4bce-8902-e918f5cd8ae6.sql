-- Temporarily deactivate all Kie.ai models to allow project remixing
-- The KIE_AI_API_KEY secret prevents remixing when active models use it
-- To re-enable: Set is_active = true for desired models after remixing and adding the secret

UPDATE ai_models 
SET is_active = false 
WHERE provider = 'kie_ai';