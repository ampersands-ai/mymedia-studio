import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Undo2, Redo2, Clock, X } from 'lucide-react';
import { ImageHistoryEntry } from '@/hooks/useImageEditHistory';
import { formatDistanceToNow } from 'date-fns';

interface ImageHistoryPanelProps {
  history: ImageHistoryEntry[];
  currentIndex: number;
  onGoToEntry: (index: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onClose: () => void;
}

export function ImageHistoryPanel({
  history,
  currentIndex,
  onGoToEntry,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onClose,
}: ImageHistoryPanelProps) {
  const getEditTypeLabel = (type: ImageHistoryEntry['editType']) => {
    const labels = {
      original: 'Original',
      cropped: 'Cropped',
      filtered: 'Filtered',
      'text-overlay': 'Text Added',
      effects: 'Effects Applied',
      template: 'Template Applied',
    };
    return labels[type];
  };

  const getEditTypeColor = (type: ImageHistoryEntry['editType']) => {
    const colors = {
      original: 'bg-muted',
      cropped: 'bg-blue-500/20 text-blue-700',
      filtered: 'bg-purple-500/20 text-purple-700',
      'text-overlay': 'bg-green-500/20 text-green-700',
      effects: 'bg-orange-500/20 text-orange-700',
      template: 'bg-pink-500/20 text-pink-700',
    };
    return colors[type];
  };

  return (
    <div className="border rounded-lg bg-background shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span className="font-medium">Edit History</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* History List */}
      <ScrollArea className="h-[300px]">
        <div className="p-2 space-y-2">
          {history.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 text-sm">
              No edit history yet
            </div>
          ) : (
            history.map((entry, index) => (
              <button
                key={entry.id}
                onClick={() => onGoToEntry(index)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  index === currentIndex
                    ? 'bg-primary/10 border-primary'
                    : 'hover:bg-muted border-transparent'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Thumbnail */}
                  <img
                    src={entry.url}
                    alt={entry.description}
                    className="w-12 h-12 rounded object-cover flex-shrink-0"
                  />
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${getEditTypeColor(
                          entry.editType
                        )}`}
                      >
                        {getEditTypeLabel(entry.editType)}
                      </span>
                      {index === currentIndex && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium truncate">{entry.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(entry.timestamp, { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Keyboard Shortcuts */}
      <div className="p-3 border-t bg-muted/30">
        <p className="text-xs text-muted-foreground text-center">
          <kbd className="px-1.5 py-0.5 bg-background rounded text-xs">Ctrl+Z</kbd> Undo •{' '}
          <kbd className="px-1.5 py-0.5 bg-background rounded text-xs">Ctrl+Shift+Z</kbd> Redo
        </p>
      </div>
    </div>
  );
}
