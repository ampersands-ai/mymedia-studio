import { useState, useEffect } from 'react';
import { VideoJob } from '@/types/video';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, AlertCircle, Volume2, XCircle, Edit } from 'lucide-react';

interface VideoJobScriptProps {
  job: VideoJob;
  onApprove: (editedScript?: string) => void;
  onCancel: () => void;
  isApproving: boolean;
  isCancelling: boolean;
}

export function VideoJobScript({ job, onApprove, onCancel, isApproving, isCancelling }: VideoJobScriptProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedScript, setEditedScript] = useState(job.script || '');

  // Sync editedScript when job.script changes (e.g., after generation completes)
  useEffect(() => {
    if (job.script) {
      setEditedScript(job.script);
    }
  }, [job.script]);

  if (job.status !== 'awaiting_script_approval' || !job.script) {
    return null;
  }

  const handleApprove = () => {
    const scriptToUse = isEditing && editedScript !== job.script ? editedScript : undefined;
    onApprove(scriptToUse);
    setIsEditing(false);
  };

  return (
    <div className="space-y-3 pt-2 border-t">
      <div className="flex items-center gap-2 text-sm font-semibold text-orange-600">
        <AlertCircle className="h-4 w-4" />
        Review Script
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-muted-foreground">Generated Script:</label>
            <Badge variant="secondary" className="text-xs">
              {(isEditing ? editedScript : job.script || '').length} chars
            </Badge>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => setIsEditing(!isEditing)}
          >
            <Edit className="w-3 h-3 mr-1" />
            {isEditing ? 'Cancel Edit' : 'Edit Script'}
          </Button>
        </div>

        {isEditing ? (
          <Textarea
            value={editedScript}
            onChange={(e) => setEditedScript(e.target.value)}
            className="min-h-[150px] text-sm font-mono"
            placeholder="Edit the script here..."
          />
        ) : (
          <ScrollArea className="h-32 rounded-md border bg-muted/30 p-3">
            <p className="text-sm whitespace-pre-wrap">{job.script}</p>
          </ScrollArea>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          size="sm"
          className="flex-1"
          onClick={handleApprove}
          disabled={isApproving || isCancelling}
        >
          {isApproving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : isEditing ? (
            <>
              <Volume2 className="w-4 h-4 mr-2" />
              Save & Generate Voiceover
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4 mr-2" />
              Generate Voiceover
            </>
          )}
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={onCancel}
          disabled={isApproving || isCancelling}
        >
          {isCancelling ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
