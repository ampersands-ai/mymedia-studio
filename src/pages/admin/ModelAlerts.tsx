import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Bell, BellOff, Plus, Trash2, TrendingUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AlertConfig {
  id: string;
  model_id: string;
  threshold_percentage: number;
  time_window_minutes: number;
  email_enabled: boolean;
  recipient_email: string | null;
  created_at: string;
  updated_at: string;
}

interface AlertHistory {
  id: string;
  model_id: string;
  failure_rate: number;
  failed_count: number;
  total_count: number;
  time_window_start: string;
  time_window_end: string;
  email_sent: boolean;
  created_at: string;
}

export default function ModelAlerts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<AlertConfig | null>(null);

  // Fetch alert configurations
  const { data: configs, isLoading } = useQuery({
    queryKey: ["model-alert-configs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("model_alert_configs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as AlertConfig[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch alert history
  const { data: history } = useQuery({
    queryKey: ["model-alert-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("model_alert_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as AlertHistory[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch available models
  const { data: models } = useQuery({
    queryKey: ["ai-models"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_models")
        .select("id, model_name")
        .order("model_name");

      if (error) throw error;
      return data;
    },
  });

  // Delete configuration
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("model_alert_configs")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["model-alert-configs"] });
      toast({
        title: "Configuration deleted",
        description: "Alert configuration has been removed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Toggle email enabled
  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("model_alert_configs")
        .update({ email_enabled: enabled })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["model-alert-configs"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Model Health Alerts</h1>
          <p className="text-muted-foreground mt-2">
            Configure email notifications when model failure rates exceed thresholds
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingConfig(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Alert
            </Button>
          </DialogTrigger>
          <DialogContent>
            <AlertConfigForm
              config={editingConfig}
              models={models || []}
              onClose={() => {
                setDialogOpen(false);
                setEditingConfig(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Configurations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Active Alert Configurations
          </CardTitle>
          <CardDescription>
            Manage your model health monitoring alerts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!configs || configs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No alert configurations yet</p>
              <p className="text-sm">Create your first alert to start monitoring model health</p>
            </div>
          ) : (
            <div className="space-y-4">
              {configs.map((config) => (
                <div
                  key={config.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg">{config.model_id}</h3>
                      {config.email_enabled ? (
                        <Bell className="h-4 w-4 text-primary" />
                      ) : (
                        <BellOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1 space-y-1">
                      <p>
                        <strong>Threshold:</strong> {config.threshold_percentage}% failure rate
                      </p>
                      <p>
                        <strong>Time Window:</strong> Last {config.time_window_minutes} minutes
                      </p>
                      {config.recipient_email && (
                        <p>
                          <strong>Recipient:</strong> {config.recipient_email}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={config.email_enabled}
                      onCheckedChange={(enabled) =>
                        toggleMutation.mutate({ id: config.id, enabled })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(config.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recent Alerts
          </CardTitle>
          <CardDescription>History of triggered alerts</CardDescription>
        </CardHeader>
        <CardContent>
          {!history || history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No alerts triggered yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{alert.model_id}</h4>
                      <span className="text-xs px-2 py-1 rounded-full bg-destructive/10 text-destructive font-semibold">
                        {alert.failure_rate.toFixed(2)}% failure
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {alert.failed_count} / {alert.total_count} requests failed •{" "}
                      {new Date(alert.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    {alert.email_sent ? (
                      <span className="text-xs text-green-600 dark:text-green-400">
                        ✓ Email sent
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">No email</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface AlertConfigFormProps {
  config: AlertConfig | null;
  models: Array<{ id: string; model_name: string }>;
  onClose: () => void;
}

function AlertConfigForm({ config, models, onClose }: AlertConfigFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    model_id: config?.model_id || "",
    threshold_percentage: config?.threshold_percentage || 10,
    time_window_minutes: config?.time_window_minutes || 60,
    email_enabled: config?.email_enabled ?? true,
    recipient_email: config?.recipient_email || "",
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (config) {
        const { error } = await supabase
          .from("model_alert_configs")
          .update(formData)
          .eq("id", config.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("model_alert_configs")
          .insert({ ...formData, user_id: user.id });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["model-alert-configs"] });
      toast({
        title: config ? "Alert updated" : "Alert created",
        description: "Your alert configuration has been saved.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>{config ? "Edit Alert" : "Create Alert"}</DialogTitle>
        <DialogDescription>
          Configure when to receive email notifications for model failures
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="model_id">Model</Label>
          <Select
            value={formData.model_id}
            onValueChange={(value) => setFormData({ ...formData, model_id: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {models.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.model_name || model.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="threshold">Failure Threshold (%)</Label>
          <Input
            id="threshold"
            type="number"
            min="1"
            max="100"
            value={formData.threshold_percentage}
            onChange={(e) =>
              setFormData({ ...formData, threshold_percentage: parseFloat(e.target.value) })
            }
          />
          <p className="text-xs text-muted-foreground">
            Alert when failure rate exceeds this percentage
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="time_window">Time Window (minutes)</Label>
          <Input
            id="time_window"
            type="number"
            min="5"
            max="1440"
            value={formData.time_window_minutes}
            onChange={(e) =>
              setFormData({ ...formData, time_window_minutes: parseInt(e.target.value) })
            }
          />
          <p className="text-xs text-muted-foreground">
            Monitor failures within this time period
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="recipient_email">Recipient Email (optional)</Label>
          <Input
            id="recipient_email"
            type="email"
            placeholder="Leave empty to use your account email"
            value={formData.recipient_email}
            onChange={(e) =>
              setFormData({ ...formData, recipient_email: e.target.value })
            }
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="email_enabled"
            checked={formData.email_enabled}
            onCheckedChange={(enabled) =>
              setFormData({ ...formData, email_enabled: enabled })
            }
          />
          <Label htmlFor="email_enabled">Enable email notifications</Label>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={!formData.model_id || saveMutation.isPending}
        >
          {saveMutation.isPending ? "Saving..." : config ? "Update" : "Create"}
        </Button>
      </div>
    </>
  );
}
