-- Create onboarding tracking table
CREATE TABLE public.user_onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Onboarding state
  is_complete BOOLEAN DEFAULT FALSE,
  dismissed BOOLEAN DEFAULT FALSE,
  
  -- Checklist items (7 total)
  viewed_templates BOOLEAN DEFAULT FALSE,
  selected_template BOOLEAN DEFAULT FALSE,
  entered_prompt BOOLEAN DEFAULT FALSE,
  viewed_token_cost BOOLEAN DEFAULT FALSE,
  completed_first_generation BOOLEAN DEFAULT FALSE,
  viewed_result BOOLEAN DEFAULT FALSE,
  downloaded_result BOOLEAN DEFAULT FALSE,
  
  -- Tracking
  first_generation_id UUID REFERENCES public.generations(id),
  bonus_awarded BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Users can only view/update their own onboarding progress
CREATE POLICY "Users manage own onboarding" ON public.user_onboarding_progress
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_onboarding_user_id ON public.user_onboarding_progress(user_id);
CREATE INDEX idx_onboarding_incomplete ON public.user_onboarding_progress(is_complete) WHERE is_complete = FALSE;

-- Trigger to update updated_at
CREATE TRIGGER update_onboarding_updated_at
  BEFORE UPDATE ON public.user_onboarding_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Create function for bonus token award
CREATE OR REPLACE FUNCTION public.award_onboarding_bonus()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if onboarding just became complete and bonus not yet awarded
  IF NEW.is_complete = TRUE 
     AND NEW.bonus_awarded = FALSE 
     AND (OLD.is_complete = FALSE OR OLD.is_complete IS NULL) THEN
    
    -- Award 100 bonus tokens
    UPDATE public.user_subscriptions
    SET 
      tokens_remaining = tokens_remaining + 100,
      tokens_total = tokens_total + 100
    WHERE user_id = NEW.user_id;
    
    -- Mark bonus as awarded
    NEW.bonus_awarded = TRUE;
    NEW.completed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach trigger for bonus award
CREATE TRIGGER award_onboarding_bonus_trigger
  BEFORE UPDATE ON public.user_onboarding_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.award_onboarding_bonus();

-- Update handle_new_user to initialize onboarding
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $function$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name,
    phone_number,
    country,
    zipcode,
    email_verified
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone_number',
    NEW.raw_user_meta_data->>'country',
    NEW.raw_user_meta_data->>'zipcode',
    FALSE
  );
  
  -- Create freemium subscription with 500 tokens
  INSERT INTO public.user_subscriptions (user_id, plan, tokens_remaining, tokens_total)
  VALUES (NEW.id, 'freemium', 500, 500);
  
  -- Initialize onboarding progress
  INSERT INTO public.user_onboarding_progress (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$function$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;