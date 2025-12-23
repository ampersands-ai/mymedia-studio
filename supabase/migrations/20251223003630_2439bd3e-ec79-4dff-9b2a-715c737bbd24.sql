-- Fix function search path for notify_generation_status
CREATE OR REPLACE FUNCTION public.notify_generation_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify on status change to COMPLETED or FAILED
  IF NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED' THEN
    INSERT INTO public.user_notifications (user_id, type, title, message, action_url, metadata)
    VALUES (
      NEW.user_id,
      'generation_complete',
      'Generation Complete',
      'Your ' || NEW.type || ' generation is ready to view.',
      '/dashboard/history',
      jsonb_build_object('generation_id', NEW.id, 'type', NEW.type)
    );
  ELSIF NEW.status = 'FAILED' AND OLD.status != 'FAILED' THEN
    INSERT INTO public.user_notifications (user_id, type, title, message, action_url, metadata)
    VALUES (
      NEW.user_id,
      'generation_failed',
      'Generation Failed',
      'Your ' || NEW.type || ' generation encountered an error. Your credits have been refunded.',
      '/dashboard/history',
      jsonb_build_object('generation_id', NEW.id, 'type', NEW.type)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;