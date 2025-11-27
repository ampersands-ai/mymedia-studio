import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAlertConfig, type AlertConfigInput } from "@/hooks/admin/useAlertConfig";
import { AlertTriangle, Plus, Trash2, Save } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import type { AlertConfig } from "@/types/admin/webhook-monitoring";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const AlertConfigurationPanel = () => {
  const { configs, isLoading, createConfig, updateConfig, deleteConfig } = useAlertConfig();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);

  if (isLoading) {
    return <div className="text-muted-foreground">Loading configurations...</div>;
  }

  const providerConfigs = configs || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Alert Configuration
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Manage webhook health monitoring thresholds and alert settings per provider
          </p>
        </div>
        <Button
          onClick={() => setShowNewForm(true)}
          size="sm"
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Provider Config
        </Button>
      </div>

      {/* Provider Configurations */}
      {providerConfigs.length > 0 && (
        <div className="space-y-4">
          {providerConfigs.map((config) => (
            <Card key={config.id} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h5 className="font-bold text-lg">{config.provider}</h5>
                  <p className="text-xs text-muted-foreground">
                    Health monitoring thresholds
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (confirm(`Delete configuration for ${config.provider}?`)) {
                      deleteConfig(config.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <ConfigForm
                config={config}
                onSave={(input) => {
                  updateConfig({ id: config.id, input });
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
                isEditing={editingId === config.id}
                onEdit={() => setEditingId(config.id)}
              />
            </Card>
          ))}
        </div>
      )}

      {/* New Provider Form */}
      {showNewForm && (
        <>
          <Separator />
          <Card className="p-6 border-primary">
            <h4 className="font-bold text-lg mb-4">New Provider Configuration</h4>
            <ConfigForm
              onSave={(input) => {
                createConfig(input);
                setShowNewForm(false);
              }}
              onCancel={() => setShowNewForm(false)}
              isEditing={true}
              isNew={true}
            />
          </Card>
        </>
      )}
    </div>
  );
};

interface ConfigFormProps {
  config?: AlertConfig;
  onSave: (input: AlertConfigInput) => void;
  onCancel: () => void;
  isEditing: boolean;
  onEdit?: () => void;
  isNew?: boolean;
}

const ConfigForm = ({ config, onSave, onCancel, isEditing, onEdit, isNew }: ConfigFormProps) => {
  const [formData, setFormData] = useState<AlertConfigInput>({
    provider: config?.provider || '',
    success_rate_threshold: config?.success_rate_threshold || 0.90,
    failure_threshold: config?.failure_threshold || 5,
    timeout_threshold_ms: config?.timeout_threshold_ms || 10000,
    alert_cooldown_minutes: config?.alert_cooldown_minutes || 30,
    enabled: config?.enabled ?? true,
  });

  if (!isEditing && !isNew) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Success Rate</p>
            <p className="font-bold">&ge; {((config?.success_rate_threshold ?? 0) * 100).toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-muted-foreground">Failure Threshold</p>
            <p className="font-bold">{config?.failure_threshold ?? 0} failures</p>
          </div>
          <div>
            <p className="text-muted-foreground">Timeout Threshold</p>
            <p className="font-bold">{config?.timeout_threshold_ms ?? 0}ms</p>
          </div>
          <div>
            <p className="text-muted-foreground">Alert Cooldown</p>
            <p className="font-bold">{config?.alert_cooldown_minutes ?? 0}m</p>
          </div>
          <div>
            <p className="text-muted-foreground">Status</p>
            <p className="font-bold">{config?.enabled ? '✓ Enabled' : '✗ Disabled'}</p>
          </div>
        </div>
        <Button onClick={onEdit} variant="outline" size="sm" className="gap-2">
          <Save className="h-4 w-4" />
          Edit Configuration
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isNew && (
        <div>
          <Label>Provider Name</Label>
          <Select
            value={formData.provider}
            onValueChange={(value) => setFormData(prev => ({ ...prev, provider: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kie-ai">KIE AI</SelectItem>
              <SelectItem value="runware">Runware</SelectItem>
              <SelectItem value="json2video">Json2Video</SelectItem>
              <SelectItem value="dodo-payments">Dodo Payments</SelectItem>
              <SelectItem value="midjourney">Midjourney</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Success Rate Threshold</Label>
          <Input
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={formData.success_rate_threshold}
            onChange={(e) => setFormData(prev => ({ ...prev, success_rate_threshold: parseFloat(e.target.value) }))}
          />
          <p className="text-xs text-muted-foreground mt-1">Alert if below (0.0-1.0, e.g. 0.90 = 90%)</p>
        </div>

        <div>
          <Label>Failure Threshold</Label>
          <Input
            type="number"
            min="1"
            value={formData.failure_threshold}
            onChange={(e) => setFormData(prev => ({ ...prev, failure_threshold: parseInt(e.target.value) }))}
          />
          <p className="text-xs text-muted-foreground mt-1">Number of consecutive failures</p>
        </div>

        <div>
          <Label>Timeout Threshold (ms)</Label>
          <Input
            type="number"
            min="0"
            step="1000"
            value={formData.timeout_threshold_ms}
            onChange={(e) => setFormData(prev => ({ ...prev, timeout_threshold_ms: parseInt(e.target.value) }))}
          />
          <p className="text-xs text-muted-foreground mt-1">Alert if response time exceeds this</p>
        </div>

        <div>
          <Label>Alert Cooldown (minutes)</Label>
          <Input
            type="number"
            min="1"
            value={formData.alert_cooldown_minutes}
            onChange={(e) => setFormData(prev => ({ ...prev, alert_cooldown_minutes: parseInt(e.target.value) }))}
          />
          <p className="text-xs text-muted-foreground mt-1">Time between repeated alerts</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={formData.enabled}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enabled: checked }))}
        />
        <Label>Enable Monitoring</Label>
      </div>

      <div className="flex gap-2 pt-4">
        <Button onClick={() => onSave(formData)} className="gap-2">
          <Save className="h-4 w-4" />
          {isNew ? 'Create' : 'Save Changes'}
        </Button>
        <Button onClick={onCancel} variant="outline">
          Cancel
        </Button>
      </div>
    </div>
  );
};
