import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/posthog";
import { logger, generateRequestId } from "@/lib/logger";
import { handleError, GenerationError } from "@/lib/errors";
import {
  GenerationParams,
  GenerationResult,
  GenerationParamsSchema,
  GenerationResponseSchema,
  GenerationErrorCode,
  type InsufficientCreditsError,
} from "@/types/generation";
import { getModel } from "@/lib/models/registry";

const generationLogger = logger.child({ component: 'useGeneration' });

export const useGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = async (params: GenerationParams): Promise<GenerationResult> => {
    const requestId = generateRequestId();
    const timer = generationLogger.startTimer('generate', { requestId });
    
    setIsGenerating(true);
    setResult(null);
    setError(null);

    try {
      // Validate input parameters
      const validatedParams = GenerationParamsSchema.parse(params);
      // STEP 1: Try to refresh the session to get a fresh token
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();

      if (sessionError || !session) {
        const error = handleError(sessionError || new Error('Session expired'), {
          requestId,
          reason: 'session_expired',
          component: 'useGeneration'
        });
        generationLogger.error("Session refresh failed", error, { requestId });
        
        // Save the generation attempt data before forcing logout
        const draftKey = 'pending_generation';
        localStorage.setItem(draftKey, JSON.stringify({
          params,
          timestamp: Date.now(),
          reason: 'session_expired'
        }));
        
        // Force logout and throw error to be caught by component
        await supabase.auth.signOut();
        throw new GenerationError(
          GenerationErrorCode.SESSION_EXPIRED,
          "Your session has expired. Please log in again.",
          { recoverable: true }
        );
      }

      // Always use async endpoint (unified flow for all providers)
      const functionName = 'generate-content';
      generationLogger.info('Using unified async endpoint', { 
        requestId,
        model_record_id: params.model_record_id,
        has_prompt: !!params.prompt
      });

      // Client-side prompt validation (only if prompt is being sent)
      if (validatedParams.prompt !== undefined) {
        const effectivePromptClient = validatedParams.prompt.trim();
        if (effectivePromptClient.length < 2) {
          const errorMessage = "Please enter a prompt at least 2 characters long.";
          setError(errorMessage);
          throw new GenerationError(
            GenerationErrorCode.PROMPT_TOO_SHORT,
            errorMessage,
            { recoverable: true }
          );
        }
      }

      // STEP 2: Load model from .ts registry and prepare request
      // NEW: Send full model config to edge function (eliminates database lookup)
      const modelModule = getModel(validatedParams.model_record_id);

      const bodyToSend = {
        ...validatedParams,
        model_config: modelModule.MODEL_CONFIG,  // Full model config from .ts file
        model_schema: modelModule.SCHEMA,        // Model schema from .ts file
      };

      // Dev-only: Log exact payload for test vs production comparison
      generationLogger.debug("Generation payload prepared with .ts registry", {
        requestId,
        model_record_id: bodyToSend.model_record_id,
        model_id: bodyToSend.model_config.modelId,
        provider: bodyToSend.model_config.provider,
        prompt: bodyToSend.prompt?.substring(0, 100), // Log first 100 chars only
        custom_parameters: bodyToSend.custom_parameters,
        enhance_prompt: bodyToSend.enhance_prompt,
      });
      
      let { data, error } = await supabase.functions.invoke(functionName, {
        body: bodyToSend,
      });
      
      // Retry logic for token concurrency errors (409)
      if (error && (error.message?.includes("409") || error.message?.includes("TOKEN_CONCURRENCY"))) {
        const MAX_CLIENT_RETRIES = 3;
        let attempt = 0;
        generationLogger.warn("Token concurrency detected, applying client retries", { requestId, MAX_CLIENT_RETRIES });
        while (
          attempt < MAX_CLIENT_RETRIES &&
          (error && (error.message?.includes("409") || error.message?.includes("TOKEN_CONCURRENCY")))
        ) {
          attempt++;
          const base = 120; // ms
          const exp = Math.min(5, attempt - 1);
          const backoff = base * Math.pow(2, exp);
          const jitter = Math.random() * 150; // 0-150ms
          const delay = Math.min(800, Math.round(backoff + jitter));
          await new Promise(resolve => setTimeout(resolve, delay));
          const retryResult = await supabase.functions.invoke(functionName, {
            body: bodyToSend,
          });
          data = retryResult.data;
          error = retryResult.error;
        }
      }

      if (error) {
        const handledError = handleError(error, {
          requestId,
          errorMessage: error.message,
          component: 'useGeneration'
        });
        generationLogger.error("Edge function error", handledError, { requestId });
        
        // Handle 401 specifically (shouldn't happen after refresh, but defensive)
        if (error.message?.includes("401") || error.message?.toLowerCase().includes("unauthorized")) {
          generationLogger.warn("Unauthorized error after refresh, forcing logout", { requestId });
          localStorage.setItem('pending_generation', JSON.stringify({
            params,
            timestamp: Date.now(),
            reason: 'unauthorized'
          }));
          await supabase.auth.signOut();
          throw new GenerationError(
            GenerationErrorCode.UNAUTHORIZED,
            "Authentication required. Please log in again.",
            { recoverable: true }
          );
        }
        
        // Enhanced 402 handling with structured error
        if (error.message?.includes("402") || error.message?.toLowerCase().includes("insufficient")) {
          const creditDetails: { required?: number; available?: number } = {};
          try {
            // Try to parse error context from edge function response
            const errorMatch = error.message.match(/required[:\s]+(\d+)[,\s]+available[:\s]+(\d+)/i);
            if (errorMatch) {
              creditDetails.required = parseInt(errorMatch[1]);
              creditDetails.available = parseInt(errorMatch[2]);
            }
          } catch {
            // If parsing fails, continue with basic error
            generationLogger.warn("Failed to parse credit details", { requestId });
          }
          
          const creditsError: InsufficientCreditsError = {
            type: 'INSUFFICIENT_CREDITS',
            message: "Insufficient credits",
            ...creditDetails
          };
          
          throw new Error(JSON.stringify(creditsError));
        }
        
        if (error.message?.includes("429")) {
          throw new GenerationError(
            GenerationErrorCode.RATE_LIMITED,
            "Rate limit exceeded. Please try again later.",
            { recoverable: true }
          );
        }
        
        if (error.message?.includes("400")) {
          // Try to extract specific error and details from edge function response
          try {
            const errorMatch = error.message.match(/error['":\s]+([^"'}]+)/i);
            const detailsMatch = error.message.match(/details['":\s]+([^"'}]+)/i);
            const specificError = errorMatch ? errorMatch[1] : error.message;
            const errorDetails = detailsMatch ? ` (${detailsMatch[1]})` : '';
            throw new GenerationError(
              GenerationErrorCode.INVALID_REQUEST,
              specificError + errorDetails,
              { recoverable: true }
            );
          } catch {
            throw new GenerationError(
              GenerationErrorCode.INVALID_REQUEST,
              error.message || "Invalid request",
              { recoverable: true }
            );
          }
        }
        
        throw handledError;
      }

      if (data.error) {
        throw new GenerationError(
          GenerationErrorCode.INVALID_REQUEST,
          data.error,
          { recoverable: true }
        );
      }

      // Normalize the response: ensure 'id' is always present
      if (data.generation_id && !data.id) {
        data.id = data.generation_id;
      }

      // Parse as union type (handles both acks and complete results)
      const validatedResponse = GenerationResponseSchema.parse(data);
      
      // Normalize to GenerationResult for downstream code
      const validatedResult: GenerationResult = validatedResponse as GenerationResult;

      // Track generation created
      const duration = timer.end({ 
        generation_id: validatedResult.id,
        tokens_used: validatedResult.tokens_used 
      });
      
      trackEvent('generation_created', {
        generation_id: validatedResult.id,
        model_id: validatedParams.model_id,
        template_id: validatedParams.template_id,
        tokens_used: validatedResult.tokens_used,
        content_type: validatedResult.content_type,
        duration,
      });

      generationLogger.info('Generation completed', {
        requestId,
        generation_id: validatedResult.id,
        status: validatedResult.status,
        duration,
      });

      setResult(validatedResult);
      // Don't show success toast immediately for async generations
      // Components will handle their own success messages
      return validatedResult;
    } catch (error) {
      const handledError = handleError(error, { 
        requestId,
        component: 'useGeneration',
        operation: 'generate'
      });
      
      generationLogger.error("Generation failed", handledError, { requestId });
      const errorMessage = handledError.message || "Failed to generate content";
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
