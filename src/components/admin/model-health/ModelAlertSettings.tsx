import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const ModelAlertSettings = () => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["model-alert-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("setting_key, setting_value")
        .in("setting_key", [
          "model_alerts_enabled",
          "model_failure_threshold",
          "model_failure_window_minutes"
        ]);

      if (error) throw error;

      const settingsMap = new Map(data.map(s => [s.setting_key, s.setting_value]));
      return {
        enabled: settingsMap.get("model_alerts_enabled") === true,
        threshold: Number(settingsMap.get("model_failure_threshold")) || 3,
        windowMinutes: Number(settingsMap.get("model_failure_window_minutes")) || 60
      };
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<typeof settings>) => {
      const promises = [];
      
      if (updates.enabled !== undefined) {
        promises.push(
          supabase.from("app_settings")
            .upsert({ setting_key: "model_alerts_enabled", setting_value: updates.enabled })
        );
      }
      if (updates.threshold !== undefined) {
        promises.push(
          supabase.from("app_settings")
            .upsert({ setting_key: "model_failure_threshold", setting_value: updates.threshold })
        );
      }
      if (updates.windowMinutes !== undefined) {
        promises.push(
          supabase.from("app_settings")
            .upsert({ setting_key: "model_failure_window_minutes", setting_value: updates.windowMinutes })
        );
      }

      const results = await Promise.all(promises);
      const error = results.find(r => r.error)?.error;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["model-alert-settings"] });
      toast.success("Alert settings updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update settings", {
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
        <CardTitle>Model Failure Alerts</CardTitle>
        <CardDescription>
          Configure automatic alerts when models exceed failure thresholds
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="alerts-enabled">Enable Alerts</Label>
            <p className="text-sm text-muted-foreground">
              Send notifications when models fail repeatedly
            </p>
          </div>
          <Switch
            id="alerts-enabled"
            checked={settings?.enabled}
            onCheckedChange={(enabled) => updateMutation.mutate({ enabled })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="failure-threshold">Failure Threshold</Label>
          <Input
            id="failure-threshold"
            type="number"
            min="1"
            value={settings?.threshold}
            onChange={(e) => updateMutation.mutate({ threshold: parseInt(e.target.value) })}
            disabled={!settings?.enabled}
          />
          <p className="text-sm text-muted-foreground">
            Number of failures before triggering an alert
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="window-minutes">Time Window (minutes)</Label>
          <Input
            id="window-minutes"
            type="number"
            min="5"
            value={settings?.windowMinutes}
            onChange={(e) => updateMutation.mutate({ windowMinutes: parseInt(e.target.value) })}
            disabled={!settings?.enabled}
          />
          <p className="text-sm text-muted-foreground">
            Time period to count failures within
          </p>
        </div>

        <Button
          onClick={() => {
            supabase.functions.invoke("monitor-model-health").then(() => {
              toast.info("Manual health check triggered");
            });
          }}
          variant="outline"
          className="w-full"
        >
          Run Manual Health Check
        </Button>
      </CardContent>
    </Card>
  );
};
