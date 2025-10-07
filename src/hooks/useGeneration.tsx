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

  const generate = async (params: GenerationParams) => {
    setIsGenerating(true);
    setResult(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        throw new Error("Not authenticated");
      }

      const { data, error } = await supabase.functions.invoke("generate-content", {
        body: params,
      });

      if (error) {
        console.error("Edge function error:", error);
        
        // Handle specific error codes
        if (error.message?.includes("402") || error.message?.toLowerCase().includes("insufficient tokens")) {
          toast.error("Insufficient tokens. Please upgrade your plan or purchase more tokens.");
          throw new Error("Insufficient tokens");
        }
        
        if (error.message?.includes("429")) {
          toast.error("Rate limited. Please try again later.");
          throw new Error("Rate limited");
        }
        
        if (error.message?.includes("400")) {
          toast.error("Invalid parameters: " + (error.message || "Missing required fields"));
          throw new Error("Invalid parameters");
        }
        
        // Generic error for non-2xx responses
        if (error.message?.toLowerCase().includes("non-2xx status code")) {
          toast.error("Generation failed. Please check your token balance and try again.");
          throw new Error("Generation failed");
        }
        
        throw error;
      }

      if (data.error) {
        // Check if tokens were refunded
        if (data.tokens_refunded) {
          toast.error(`${data.error} ${data.tokens_refunded} tokens have been refunded.`);
        } else {
          toast.error(data.error);
        }
        throw new Error(data.error);
      }

      setResult(data);
      // Don't show success toast immediately for async generations
      // Components will handle their own success messages
      return data;
    } catch (error: any) {
      console.error("Generation error:", error);
      toast.error(error.message || "Failed to generate content");
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generate,
    isGenerating,
    result,
  };
};
