import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ModelHealthSummary } from "@/types/admin/model-health";

interface TestConfigDialogProps {
  model: ModelHealthSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: any) => void;
}

export const TestConfigDialog = ({
  model,
  open,
  onOpenChange,
  onSave,
}: TestConfigDialogProps) => {
  const [promptTemplate, setPromptTemplate] = useState("");
  const [numOutputs, setNumOutputs] = useState(1);
  const [deductCredits, setDeductCredits] = useState(false);
  const [timeoutSeconds, setTimeoutSeconds] = useState(120);
  const [retryOnFailure, setRetryOnFailure] = useState(false);
  const [maxRetries, setMaxRetries] = useState(3);
  const [expectedFormat, setExpectedFormat] = useState<string>("image");

  const handleSave = () => {
    onSave({
      prompt_template: promptTemplate,
      num_outputs: numOutputs,
      deduct_credits: deductCredits,
      timeout_seconds: timeoutSeconds,
      retry_on_failure: retryOnFailure,
      max_retries: maxRetries,
      expected_format: expectedFormat,
    });
    onOpenChange(false);
  };

  if (!model) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Test: {model.model_name}</DialogTitle>
          <DialogDescription>
            Customize test parameters for {model.provider} - {model.content_type}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Prompt Template */}
          <div className="space-y-2">
            <Label htmlFor="prompt">Prompt Template</Label>
            <Textarea
              id="prompt"
              value={promptTemplate}
              onChange={(e) => setPromptTemplate(e.target.value)}
              placeholder="Enter test prompt..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Variables: {`{{random_subject}}`}, {`{{random_style}}`}, {`{{timestamp}}`}
            </p>
          </div>

          {/* Number of Outputs */}
          <div className="space-y-2">
            <Label htmlFor="num-outputs">Number of Outputs</Label>
            <Input
              id="num-outputs"
              type="number"
              min={1}
              max={10}
              value={numOutputs}
              onChange={(e) => setNumOutputs(parseInt(e.target.value) || 1)}
            />
          </div>

          {/* Expected Format */}
          <div className="space-y-2">
            <Label htmlFor="format">Expected Output Format</Label>
            <Select value={expectedFormat} onValueChange={setExpectedFormat}>
              <SelectTrigger id="format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
                <SelectItem value="text">Text</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Timeout */}
          <div className="space-y-2">
            <Label htmlFor="timeout">Timeout (seconds)</Label>
            <Input
              id="timeout"
              type="number"
              min={30}
              max={300}
              value={timeoutSeconds}
              onChange={(e) => setTimeoutSeconds(parseInt(e.target.value) || 120)}
            />
          </div>

          {/* Retry on Failure */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="retry">Retry on Failure</Label>
              <p className="text-xs text-muted-foreground">
                Automatically retry failed tests
              </p>
            </div>
            <Switch
              id="retry"
              checked={retryOnFailure}
              onCheckedChange={setRetryOnFailure}
            />
          </div>

          {/* Max Retries */}
          {retryOnFailure && (
            <div className="space-y-2">
              <Label htmlFor="max-retries">Max Retries</Label>
              <Input
                id="max-retries"
                type="number"
                min={1}
                max={5}
                value={maxRetries}
                onChange={(e) => setMaxRetries(parseInt(e.target.value) || 3)}
              />
            </div>
          )}

          {/* Deduct Credits */}
          <div className="flex items-center justify-between border-t pt-4">
            <div className="space-y-0.5">
              <Label htmlFor="deduct" className="text-destructive">
                Deduct Credits (Use with caution)
              </Label>
              <p className="text-xs text-muted-foreground">
                Warning: This will actually deduct credits from test user
              </p>
            </div>
            <Switch
              id="deduct"
              checked={deductCredits}
              onCheckedChange={setDeductCredits}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Configuration</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
