import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Edit3, Check, X } from 'lucide-react';

interface ScriptReviewStepProps {
  script: string;
  onScriptChange: (script: string) => void;
  onContinue: () => void;
  isDisabled: boolean;
}

export function ScriptReviewStep({
  script,
  onScriptChange,
  onContinue,
  isDisabled,
}: ScriptReviewStepProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedScript, setEditedScript] = useState(script);

  // Sync editedScript when script prop changes (e.g., after generation)
  useEffect(() => {
    setEditedScript(script);
  }, [script]);

  const wordCount = script.trim().split(/\s+/).filter(Boolean).length;
  const charCount = script.length;

  const handleSaveEdit = () => {
    onScriptChange(editedScript);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedScript(script);
    setIsEditing(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-bold">Generated Script</Label>
        {!isEditing && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
            disabled={isDisabled}
            className="h-9 min-h-[44px] sm:min-h-0"
          >
            <Edit3 className="mr-1.5 h-3 w-3" />
            Edit Script
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <Textarea
            value={editedScript}
            onChange={(e) => setEditedScript(e.target.value)}
            className="min-h-[200px] text-sm"
            disabled={isDisabled}
          />
          <div className="flex gap-2">
            <Button
              onClick={handleSaveEdit}
              disabled={isDisabled || !editedScript.trim()}
              className="flex-1 min-h-[44px]"
            >
              <Check className="mr-1.5 h-4 w-4" />
              Save Changes
            </Button>
            <Button
              variant="outline"
              onClick={handleCancelEdit}
              disabled={isDisabled}
              className="min-h-[44px]"
            >
              <X className="mr-1.5 h-4 w-4" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-muted/50 rounded-lg p-4 max-h-[300px] overflow-y-auto">
            <p className="text-sm whitespace-pre-wrap leading-relaxed">
              {script}
            </p>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{wordCount} words</span>
            <span>{charCount} characters</span>
          </div>
        </div>
      )}

      {!isEditing && (
        <Button
          onClick={onContinue}
          disabled={isDisabled || !script.trim()}
          className="w-full min-h-[48px] font-bold"
          size="lg"
        >
          Continue to Voiceover
        </Button>
      )}
    </div>
  );
}
