-- Phase 1: Add missing RLS policies for core functionality

-- 1. Profiles INSERT policy (allows users to create their own profile)
CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 2. User subscriptions INSERT policy (allows system to create subscriptions for new users)
CREATE POLICY "System can insert user subscription" ON public.user_subscriptions
FOR INSERT 
WITH CHECK (true);

-- 3. User subscriptions UPDATE policy (allows users to update their own subscription)
CREATE POLICY "Users can update own subscription" ON public.user_subscriptions
FOR UPDATE 
USING (auth.uid() = user_id);

-- 4. Generations UPDATE policy (allows users to update their own generations)
CREATE POLICY "Users can update own generations" ON public.generations
FOR UPDATE 
USING (auth.uid() = user_id);

-- 5. Add index for better performance on token balance queries
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);

-- 6. Add index for better performance on generations queries
CREATE INDEX IF NOT EXISTS idx_generations_user_id_status ON public.generations(user_id, status);