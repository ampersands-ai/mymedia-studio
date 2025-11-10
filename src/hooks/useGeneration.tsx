import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/posthog";

interface GenerationParams {
  template_id?: string;
  model_id?: string;
  model_record_id?: string;
  prompt?: string;
  custom_parameters?: Record<string, any>;
  enhance_prompt?: boolean;
}

interface GenerationResult {
  id: string;
  output_url?: string; // Optional for async generations
  tokens_used: number;
  status: string;
  content_type: string;
  enhanced: boolean;
  is_async?: boolean; // Flag to indicate async generation
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

      // Always use async endpoint (unified flow for all providers)
      const functionName = 'generate-content';
      console.log('Using unified async endpoint for all providers');

      // Client-side prompt validation (only if prompt is being sent)
      if (params.prompt !== undefined) {
        const effectivePromptClient = params.prompt.trim();
        if (effectivePromptClient.length < 2) {
          const errorMessage = "Please enter a prompt at least 2 characters long.";
          setError(errorMessage);
          throw new Error("Prompt is required");
        }
      }

      // STEP 2: Proceed with generation using appropriate endpoint
      const bodyToSend = { ...params } as any;
      
      // Dev-only: Log exact payload for test vs production comparison
      if (import.meta.env.DEV) {
        console.debug("🚀 GENERATION_PAYLOAD", {
          model_record_id: bodyToSend.model_record_id,
          prompt: bodyToSend.prompt,
          custom_parameters: bodyToSend.custom_parameters,
          enhance_prompt: bodyToSend.enhance_prompt,
        });
      }
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: bodyToSend,
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
        
        // Enhanced 402 handling with structured error
        if (error.message?.includes("402") || error.message?.toLowerCase().includes("insufficient")) {
          let creditDetails: { required?: number; available?: number } = {};
          try {
            // Try to parse error context from edge function response
            const errorMatch = error.message.match(/required[:\s]+(\d+)[,\s]+available[:\s]+(\d+)/i);
            if (errorMatch) {
              creditDetails.required = parseInt(errorMatch[1]);
              creditDetails.available = parseInt(errorMatch[2]);
            }
          } catch (e) {
            // If parsing fails, continue with basic error
          }
          
          throw new Error(JSON.stringify({
            type: "INSUFFICIENT_CREDITS",
            message: "Insufficient credits",
            ...creditDetails
          }));
        }
        
        if (error.message?.includes("429")) {
          throw new Error("Rate limited");
        }
        
        if (error.message?.includes("400")) {
          // Try to extract specific error from edge function response
          try {
            const errorMatch = error.message.match(/error['":\s]+([^"'}]+)/i);
            const specificError = errorMatch ? errorMatch[1] : error.message;
            throw new Error(specificError);
          } catch {
            throw new Error(error.message || "Invalid request");
          }
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

      // Track generation created
      trackEvent('generation_created', {
        generation_id: data.id,
        model_id: params.model_id,
        template_id: params.template_id,
        tokens_used: data.tokens_used,
        content_type: data.content_type,
      });

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
