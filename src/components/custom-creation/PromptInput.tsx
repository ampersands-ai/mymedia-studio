import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2 } from "lucide-react";

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  isRequired: boolean;
  maxLength: number;
  onSurpriseMe: () => void;
  onEnhance: (enabled: boolean) => void;
  enhanceEnabled: boolean;
  disabled: boolean;
  generateCaption: boolean;
  onGenerateCaptionChange: (enabled: boolean) => void;
  generatingSurprise: boolean;
}

/**
 * Prompt textarea with character counter, Surprise Me, Enhance toggle, and caption checkbox
 */
export const PromptInput: React.FC<PromptInputProps> = ({
  value,
  onChange,
  isRequired,
  maxLength,
  onSurpriseMe,
  onEnhance,
  enhanceEnabled,
  disabled,
  generateCaption,
  onGenerateCaptionChange,
  generatingSurprise,
}) => {
  const isOverLimit = value.length > maxLength;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">
          Prompt {isRequired && <span className="text-destructive">*</span>}
        </label>
        <span className={`text-xs ${isOverLimit ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
          {value.length} / {maxLength}
        </span>
      </div>

      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Describe what you want to create..."
        className={`min-h-[120px] bg-background border-border focus:border-primary transition-colors ${
          isOverLimit ? 'border-destructive focus:border-destructive' : ''
        }`}
        disabled={disabled}
      />

      {isOverLimit && (
        <p className="text-xs text-destructive">
          Prompt exceeds maximum length. Please shorten it.
        </p>
      )}

      <div className="flex flex-col gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onSurpriseMe}
          disabled={generatingSurprise || disabled}
          className="w-full justify-center gap-2"
        >
          {generatingSurprise ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Surprise Me
        </Button>

        <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
          <Label htmlFor="enhance-prompt" className="text-sm font-medium cursor-pointer">
            Enhance Prompt
          </Label>
          <Switch
            id="enhance-prompt"
            checked={enhanceEnabled}
            onCheckedChange={onEnhance}
            disabled={disabled}
          />
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
          <div className="flex flex-col gap-1">
            <Label htmlFor="generate-caption" className="text-sm font-medium cursor-pointer">
              Generate Caption & Hashtags
            </Label>
            <span className="text-xs text-muted-foreground">+8 tokens</span>
          </div>
          <Checkbox
            id="generate-caption"
            checked={generateCaption}
            onCheckedChange={(checked) => onGenerateCaptionChange(checked as boolean)}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
};
