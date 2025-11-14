import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2 } from "lucide-react";
import { CAPTION_GENERATION_COST } from "@/constants/custom-creation";
import { logger } from "@/lib/logger";

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  isRequired: boolean;
  maxLength: number;
  onSurpriseMe: () => void;
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
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              logger.info('Surprise Me button clicked', {
                isDisabled: generatingSurprise || disabled,
                generatingSurprise,
                disabled,
                timestamp: Date.now()
              });
              onSurpriseMe();
            }}
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
          variant={generateCaption ? "secondary" : "outline"}
          size="sm"
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onGenerateCaptionChange(!generateCaption);
          }}
          disabled={disabled}
          className="h-8 text-xs gap-1.5"
        >
          <Sparkles className="h-3 w-3" />
          Generate Caption
          <span className="text-muted-foreground ml-1">(+{CAPTION_GENERATION_COST})</span>
        </Button>
      </div>
    </div>
  );
};
