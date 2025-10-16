import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * ⚠️ SECURITY NOTE: This client-side check is for UX purposes only.
 * 
 * This hook determines whether to show/hide admin UI components in the browser.
 * It does NOT provide actual security - an attacker could manipulate browser state
 * to render admin UI components.
 * 
 * ACTUAL SECURITY is enforced by:
 * 1. Edge functions that validate admin role server-side before any operations
 * 2. RLS policies using has_role() security definer function
 * 3. Server-side validation in all admin endpoints
 * 
 * Never rely on this check for authorization - it's purely for improving user experience
 * by hiding irrelevant UI from non-admin users.
 */
export const useAdminRole = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminRole = async () => {
      // Wait for auth to complete first
      if (authLoading) {
        return;
      }

      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (error) throw error;
        setIsAdmin(!!data);
      } catch (error) {
        console.error("Error checking admin role:", error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminRole();
  }, [user, authLoading]);

  return { isAdmin, loading };
};
