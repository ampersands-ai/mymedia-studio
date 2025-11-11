import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2 } from "lucide-react";

interface WorkflowPromptInputProps {
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
 * Workflow-specific prompt input with enhancement features
 * Includes Surprise Me, Enhance Prompt, and Generate Caption
 */
export const WorkflowPromptInput: React.FC<WorkflowPromptInputProps> = ({
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
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSurpriseMe}
            disabled={generatingSurprise || disabled}
            className="h-7 gap-1.5 text-xs"
          >
            {generatingSurprise ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            Surprise Me
          </Button>
          <span className={`text-xs ${isOverLimit ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
            {value.length} / {maxLength}
          </span>
        </div>
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

      <div className="flex flex-wrap gap-2 items-center justify-end">
        <Button
          variant={enhanceEnabled ? "secondary" : "outline"}
          size="sm"
          onClick={() => onEnhance(!enhanceEnabled)}
          disabled={disabled}
          className="h-8 text-xs gap-1.5"
        >
          <Sparkles className="h-3 w-3" />
          Enhance Prompt
        </Button>

        <Button
          variant={generateCaption ? "secondary" : "outline"}
          size="sm"
          onClick={() => onGenerateCaptionChange(!generateCaption)}
          disabled={disabled}
          className="h-8 text-xs gap-1.5"
        >
          <Sparkles className="h-3 w-3" />
          Generate Caption
        </Button>
      </div>
    </div>
  );
};
