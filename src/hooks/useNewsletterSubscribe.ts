import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useNewsletterSubscribe = () => {
  const [isLoading, setIsLoading] = useState(false);

  const subscribe = async (email: string, source: string = "website"): Promise<boolean> => {
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return false;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("subscribe-newsletter", {
        body: { email, source },
      });

      if (error) {
        toast.error(error.message || "Failed to subscribe. Please try again.");
        return false;
      }

      if (data?.error) {
        toast.error(data.error);
        return false;
      }

      toast.success("Successfully subscribed to our newsletter!");
      return true;
    } catch (err) {
      toast.error("Failed to subscribe. Please try again.");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { subscribe, isLoading };
};
