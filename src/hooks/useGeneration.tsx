import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GenerationParams {
  template_id?: string;
  model_id?: string;
  model_record_id?: string;
  prompt: string;
  custom_parameters?: Record<string, any>;
  enhance_prompt?: boolean;
}

interface GenerationResult {
  id: string;
  output_url: string;
  tokens_used: number;
  status: string;
  content_type: string;
  enhanced: boolean;
}

export const useGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = async (params: GenerationParams) => {
    setIsGenerating(true);
    setResult(null);
    setError(null);

    try {
      // STEP 1: Try to refresh the session to get a fresh token
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();

      if (sessionError || !session) {
        console.error("Session refresh failed:", sessionError);
        
        // Save the generation attempt data before forcing logout
        const draftKey = 'pending_generation';
        localStorage.setItem(draftKey, JSON.stringify({
          params,
          timestamp: Date.now(),
          reason: 'session_expired'
        }));
        
        // Force logout and throw error to be caught by component
        await supabase.auth.signOut();
        throw new Error("SESSION_EXPIRED");
      }

      // STEP 2: Proceed with generation using refreshed session
      const { data, error } = await supabase.functions.invoke("generate-content", {
        body: params,
      });

      if (error) {
        console.error("Edge function error:", error);
        
        // Handle 401 specifically (shouldn't happen after refresh, but defensive)
        if (error.message?.includes("401") || error.message?.toLowerCase().includes("unauthorized")) {
          localStorage.setItem('pending_generation', JSON.stringify({
            params,
            timestamp: Date.now(),
            reason: 'unauthorized'
          }));
          await supabase.auth.signOut();
          throw new Error("SESSION_EXPIRED");
        }
        
        // Handle other specific error codes
        if (error.message?.includes("402") || error.message?.toLowerCase().includes("insufficient tokens")) {
          throw new Error("Insufficient tokens");
        }
        
        if (error.message?.includes("429")) {
          throw new Error("Rate limited");
        }
        
        if (error.message?.includes("400")) {
          // Extract specific error message from server response
          const errorMsg = error.message || "Invalid request";
          throw new Error(errorMsg);
        }
        
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      // Normalize the response: ensure 'id' is always present
      if (data.generation_id && !data.id) {
        data.id = data.generation_id;
      }

      setResult(data);
      // Don't show success toast immediately for async generations
      // Components will handle their own success messages
      return data;
    } catch (error: any) {
      console.error("Generation error:", error);
      const errorMessage = error.message || "Failed to generate content";
      setError(errorMessage);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return {
    generate,
    isGenerating,
    result,
    error,
    clearError,
  };
};
