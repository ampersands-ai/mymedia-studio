import { useState } from "react";
import { Bookmark } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { usePromptMutations } from "@/hooks/usePromptTemplates";

interface SavePromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPrompt?: string;
  initialCategory?: string;
  sourceGenerationId?: string;
}

const categories = [
  { value: "text_to_image", label: "Text to Image" },
  { value: "text_to_video", label: "Text to Video" },
  { value: "image_to_video", label: "Image to Video" },
  { value: "video_to_video", label: "Video to Video" },
  { value: "lip_sync", label: "Lip Sync" },
  { value: "text_to_audio", label: "Text to Audio" },
  { value: "image_editing", label: "Image Editing" },
  { value: "custom", label: "Custom" },
];

export const SavePromptDialog = ({
  open,
  onOpenChange,
  initialPrompt = "",
  initialCategory = "custom",
  sourceGenerationId,
}: SavePromptDialogProps) => {
  const { user } = useAuth();
  const { savePrompt } = usePromptMutations();

  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState(initialPrompt);
  const [category, setCategory] = useState(initialCategory);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !title.trim() || !prompt.trim()) return;

    savePrompt.mutate(
      {
        userId: user.id,
        title: title.trim(),
        prompt: prompt.trim(),
        category,
        sourceGenerationId,
      },
      {
        onSuccess: () => {
          handleClose();
        },
      }
    );
  };

  const handleClose = () => {
    setTitle("");
    setPrompt(initialPrompt);
    setCategory(initialCategory);
    onOpenChange(false);
  };

  // Update prompt when initialPrompt changes
  useState(() => {
    if (initialPrompt) {
      setPrompt(initialPrompt);
    }
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-black flex items-center gap-2">
            <Bookmark className="h-5 w-5" />
            Save Prompt
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My awesome prompt"
              maxLength={100}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt">Prompt</Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your prompt..."
              rows={4}
              className="resize-none"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || !prompt.trim() || savePrompt.isPending}
            >
              {savePrompt.isPending ? "Saving..." : "Save Prompt"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
