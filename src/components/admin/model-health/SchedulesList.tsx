import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Trash2, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getModel } from "@/lib/models/registry";

export const SchedulesList = () => {
  const queryClient = useQueryClient();

  const { data: schedules, isLoading } = useQuery({
    queryKey: ["model-test-schedules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("model_test_schedules")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // ADR 007: Enrich with model metadata from registry
      return (data || []).map((schedule: any) => {
        let model_name = "Unknown";
        try {
          const model = getModel(schedule.model_record_id);
          model_name = model.MODEL_CONFIG.modelName;
        } catch (e) {
          console.warn(`Failed to load model from registry:`, schedule.model_record_id, e);
        }

        return {
          ...schedule,
          model_name
        };
      });
    }
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("model_test_schedules")
        .update({ is_active: isActive })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["model-test-schedules"] });
      toast.success("Schedule updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update schedule", {
        description: error.message
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("model_test_schedules")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["model-test-schedules"] });
      toast.success("Schedule deleted");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete schedule", {
        description: error.message
      });
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Schedules</CardTitle>
        <CardDescription>
          Automated test schedules for AI models
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!schedules || schedules.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No schedules configured yet
          </p>
        ) : (
          <div className="space-y-4">
            {schedules.map((schedule: any) => (
              <div
                key={schedule.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{schedule.schedule_name}</h4>
                    <Badge variant={schedule.is_active ? "default" : "secondary"}>
                      {schedule.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {schedule.model_name} • {schedule.cron_expression}
                  </p>
                  {schedule.last_run_at && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Last run {formatDistanceToNow(new Date(schedule.last_run_at), { addSuffix: true })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={schedule.is_active}
                    onCheckedChange={(checked) =>
                      toggleMutation.mutate({ id: schedule.id, isActive: checked })
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(schedule.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
