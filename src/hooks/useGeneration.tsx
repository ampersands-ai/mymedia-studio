import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GenerationParams {
  template_id?: string;
  model_id?: string;
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
        // Handle specific error codes
        if (error.message?.includes("402")) {
          toast.error("Insufficient tokens. Please upgrade your plan.");
          throw new Error("Insufficient tokens");
        }
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data);
      toast.success("Content generated successfully!");
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
