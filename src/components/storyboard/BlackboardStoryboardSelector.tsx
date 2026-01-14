import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ChevronDown, Plus, FolderOpen, Image, Video, Clock, Loader2, Trash2 } from 'lucide-react';

import { formatDistanceToNow } from 'date-fns';
import type { BlackboardStoryboardSummary } from '@/hooks/storyboard/useBlackboardStoryboardList';

interface BlackboardStoryboardSelectorProps {
  currentStoryboardId: string | null;
  storyboards: BlackboardStoryboardSummary[];
  isLoading: boolean;
  disabled: boolean;
  onSelectStoryboard: (id: string) => void;
  onCreateNew: () => void;
  onDeleteStoryboard: (id: string) => void;
}

export function BlackboardStoryboardSelector({
  currentStoryboardId,
  storyboards,
  isLoading,
  disabled,
  onSelectStoryboard,
  onCreateNew,
  onDeleteStoryboard,
}: BlackboardStoryboardSelectorProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const currentStoryboard = storyboards.find(s => s.id === currentStoryboardId);
  const otherStoryboards = storyboards.filter(s => s.id !== currentStoryboardId);

  const getStatusBadge = (storyboard: BlackboardStoryboardSummary) => {
    if (storyboard.hasVideos) {
      return (
        <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/30">
          <Video className="w-3 h-3 mr-1" />
          Videos
        </Badge>
      );
    }
    if (storyboard.hasImages) {
      return (
        <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/30">
          <Image className="w-3 h-3 mr-1" />
          Images
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">
        Draft
      </Badge>
    );
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      onDeleteStoryboard(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled className="gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading...
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={disabled}
            className="gap-2 max-w-[200px]"
          >
            <FolderOpen className="w-4 h-4 shrink-0" />
            <span className="truncate">
              {currentStoryboard 
                ? `${currentStoryboard.sceneCount} scene${currentStoryboard.sceneCount !== 1 ? 's' : ''}`
                : 'Select Storyboard'
              }
            </span>
            <ChevronDown className="w-4 h-4 shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-80">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Your Storyboards</span>
            <Badge variant="secondary" className="text-xs">
              {storyboards.length}
            </Badge>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {/* Current Storyboard */}
          {currentStoryboard && (
            <>
              <DropdownMenuItem 
                className="flex items-start gap-3 p-3 cursor-default bg-primary/5"
                disabled
              >
                {currentStoryboard.previewImageUrl ? (
                  <img 
                    src={currentStoryboard.previewImageUrl} 
                    alt="Preview"
                    className="w-12 h-12 rounded-lg object-cover border border-border/50 shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Image className="w-5 h-5 text-muted-foreground/50" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">Current</span>
                    {getStatusBadge(currentStoryboard)}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <span>{currentStoryboard.sceneCount} scene{currentStoryboard.sceneCount !== 1 ? 's' : ''}</span>
                    <span>•</span>
                    <span>{currentStoryboard.aspectRatio.toUpperCase()}</span>
                  </div>
                </div>
              </DropdownMenuItem>
              {otherStoryboards.length > 0 && <DropdownMenuSeparator />}
            </>
          )}

          {/* Other Storyboards */}
          {otherStoryboards.length > 0 && (
            <>
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                Switch to another storyboard
              </DropdownMenuLabel>
              {otherStoryboards.map((storyboard) => (
                <DropdownMenuItem 
                  key={storyboard.id}
                  className="flex items-start gap-3 p-3 cursor-pointer group"
                  onClick={() => onSelectStoryboard(storyboard.id)}
                >
                  {storyboard.previewImageUrl ? (
                    <img 
                      src={storyboard.previewImageUrl} 
                      alt="Preview"
                      className="w-12 h-12 rounded-lg object-cover border border-border/50 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Image className="w-5 h-5 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(storyboard)}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <span>{storyboard.sceneCount} scene{storyboard.sceneCount !== 1 ? 's' : ''}</span>
                      <span>•</span>
                      <span>{storyboard.aspectRatio.toUpperCase()}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(storyboard.updatedAt), { addSuffix: true })}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={(e) => handleDelete(e, storyboard.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          )}

          {/* Create New */}
          <DropdownMenuItem 
            className="flex items-center gap-2 p-3 cursor-pointer"
            onClick={onCreateNew}
          >
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Plus className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="font-medium text-sm">Create New Storyboard</span>
              <p className="text-xs text-muted-foreground">Start fresh with a blank canvas</p>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Storyboard</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this storyboard? This action cannot be undone.
              All scenes, images, and videos will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
