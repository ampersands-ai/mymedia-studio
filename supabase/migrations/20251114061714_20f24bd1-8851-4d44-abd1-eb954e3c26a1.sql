-- Backfill onboarding progress for existing users
-- This ensures users who signed up before the onboarding system existed
-- don't see the welcome modal

INSERT INTO public.user_onboarding_progress (
  user_id, 
  is_complete, 
  dismissed,
  viewed_templates,
  selected_template,
  entered_prompt,
  completed_first_generation,
  viewed_result,
  downloaded_result
)
SELECT 
  au.id,
  true,  -- Mark as complete
  true,  -- Mark as dismissed  
  true,
  true,
  true,
  true,
  true,
  true
FROM auth.users au
LEFT JOIN public.user_onboarding_progress uop ON au.id = uop.user_id
WHERE uop.user_id IS NULL  -- Only for users without a record
ON CONFLICT (user_id) DO NOTHING;