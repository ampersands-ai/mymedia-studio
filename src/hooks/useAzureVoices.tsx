import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AzureVoice {
  id: string;
  voice_id: string;
  voice_name: string;
  language: string;
  country: string;
  language_code: string;
  provider: string;
  tags: Record<string, any>;
  preview_url: string | null;
  has_preview: boolean;
  is_active: boolean;
  description: string | null;
}

export const useAzureVoices = () => {
  return useQuery({
    queryKey: ["azure-voices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("azure_voices")
        .select("*")
        .eq("is_active", true)
        .order("language", { ascending: true })
        .order("voice_name", { ascending: true });

      if (error) throw error;
      return (data as AzureVoice[]) || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useAzureVoiceFilters = (voices: AzureVoice[] | undefined) => {
  if (!voices) return { languages: [], countries: [] };

  const languages = Array.from(new Set(voices.map(v => v.language))).sort();
  const countries = Array.from(new Set(voices.map(v => v.country))).sort();

  return { languages, countries };
};
