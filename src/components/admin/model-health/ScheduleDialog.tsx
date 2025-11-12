import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { ModelHealthSummary } from "@/types/admin/model-health";
import { logger } from "@/lib/logger";

interface ScheduleDialogProps {
  model: ModelHealthSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CRON_PRESETS = [
  { label: "Every 5 minutes", value: "*/5 * * * *" },
  { label: "Every 15 minutes", value: "*/15 * * * *" },
  { label: "Every 30 minutes", value: "*/30 * * * *" },
  { label: "Every hour", value: "0 * * * *" },
  { label: "Every 6 hours", value: "0 */6 * * *" },
  { label: "Daily at midnight", value: "0 0 * * *" },
];

export const ScheduleDialog = ({ model, open, onOpenChange }: ScheduleDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [scheduleName, setScheduleName] = useState("");
  const [cronExpression, setCronExpression] = useState("*/15 * * * *");
  const [isActive, setIsActive] = useState(true);

  const handleSave = async () => {
    if (!model || !scheduleName) {
      toast.error("Please provide a schedule name");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('model_test_schedules')
        .insert({
          model_record_id: model.record_id,
          schedule_name: scheduleName,
          cron_expression: cronExpression,
          is_active: isActive,
          test_config: {}
        });

      if (error) throw error;

      toast.success("Schedule created successfully");
      onOpenChange(false);
      setScheduleName("");
    } catch (error) {
      logger.error('Model health schedule creation failed', error as Error, {
        component: 'ScheduleDialog',
        modelId: model?.model_id,
        cronExpression,
        operation: 'createSchedule'
      });
      toast.error("Failed to create schedule");
    } finally {
      setLoading(false);
    }
  };

  if (!model) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Tests for {model.model_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="schedule-name">Schedule Name</Label>
            <Input
              id="schedule-name"
              value={scheduleName}
              onChange={(e) => setScheduleName(e.target.value)}
              placeholder="e.g., Daily Health Check"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cron-preset">Frequency</Label>
            <Select value={cronExpression} onValueChange={setCronExpression}>
              <SelectTrigger id="cron-preset">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CRON_PRESETS.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is-active">Active</Label>
            <Switch
              id="is-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Schedule
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
