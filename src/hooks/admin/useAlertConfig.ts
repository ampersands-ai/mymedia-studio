import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AlertConfig {
  id: string;
  provider: string;
  success_rate_threshold: number;
  failure_threshold: number;
  timeout_threshold_ms: number;
  alert_cooldown_minutes: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface AlertConfigInput {
  provider: string;
  success_rate_threshold: number;
  failure_threshold: number;
  timeout_threshold_ms: number;
  alert_cooldown_minutes: number;
  enabled: boolean;
}

export function useAlertConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: configs, isLoading, error } = useQuery({
    queryKey: ['alert-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('webhook_alert_config')
        .select('*')
        .order('provider');

      if (error) throw error;
      return data as unknown as AlertConfig[];
    },
  });

  const createConfig = useMutation({
    mutationFn: async (input: AlertConfigInput) => {
      const { data, error } = await supabase
        .from('webhook_alert_config')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-configs'] });
      toast({
        title: "Configuration created",
        description: "Alert configuration has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create configuration",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateConfig = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<AlertConfigInput> }) => {
      const { data, error } = await supabase
        .from('webhook_alert_config')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-configs'] });
      toast({
        title: "Configuration updated",
        description: "Alert configuration has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update configuration",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteConfig = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('webhook_alert_config')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-configs'] });
      toast({
        title: "Configuration deleted",
        description: "Alert configuration has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete configuration",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    configs,
    isLoading,
    error,
    createConfig: createConfig.mutate,
    updateConfig: updateConfig.mutate,
    deleteConfig: deleteConfig.mutate,
    isCreating: createConfig.isPending,
    isUpdating: updateConfig.isPending,
    isDeleting: deleteConfig.isPending,
  };
}
