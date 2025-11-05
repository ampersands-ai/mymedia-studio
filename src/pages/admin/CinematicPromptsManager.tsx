import { useState } from "react";
import { useAdminCinematicPrompts, CinematicPrompt } from "@/hooks/useAdminCinematicPrompts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { SmartLoader } from "@/components/ui/smart-loader";
import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";

const CATEGORIES = [
  "Film Noir Style",
  "Golden Hour",
  "Editorial Fashion",
  "Vintage Cinema",
  "Modern Cinematic",
  "Dramatic Chiaroscuro",
  "Natural Light Portraits",
  "Urban Cinematic",
  "Character Studies",
  "Anamorphic Dreams",
];

export default function CinematicPromptsManager() {
  const { prompts, isLoading, createPrompt, updatePrompt, deletePrompt, toggleActive } = useAdminCinematicPrompts();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<CinematicPrompt | null>(null);
  const [deletePromptId, setDeletePromptId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    prompt: "",
    category: "",
    source: "admin",
    quality_score: 5,
  });

  const handleOpenDialog = (prompt?: CinematicPrompt) => {
    if (prompt) {
      setEditingPrompt(prompt);
      setFormData({
        prompt: prompt.prompt,
        category: prompt.category,
        source: prompt.source,
        quality_score: prompt.quality_score,
      });
    } else {
      setEditingPrompt(null);
      setFormData({
        prompt: "",
        category: "",
        source: "admin",
        quality_score: 5,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.prompt || !formData.category) {
      return;
    }

    if (editingPrompt) {
      await updatePrompt.mutateAsync({
        id: editingPrompt.id,
        ...formData,
      });
    } else {
      await createPrompt.mutateAsync({
        ...formData,
        is_active: true,
      });
    }

    setIsDialogOpen(false);
  };

  const handleDelete = async () => {
    if (deletePromptId) {
      await deletePrompt.mutateAsync(deletePromptId);
      setIsDeleteDialogOpen(false);
      setDeletePromptId(null);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    await toggleActive.mutateAsync({ id, is_active: !currentStatus });
  };

  if (isLoading) {
    return <SmartLoader message="Loading cinematic prompts..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">Cinematic Prompts Manager</h1>
          <p className="text-muted-foreground">
            Manage curated cinematic portrait prompts for the community
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Prompt
        </Button>
      </div>

      <div className="brutal-border bg-card rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Prompt</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Quality</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prompts?.map((prompt) => (
              <TableRow key={prompt.id}>
                <TableCell className="max-w-md truncate font-medium">
                  {prompt.prompt}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{prompt.category}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{prompt.source}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: prompt.quality_score }).map((_, i) => (
                      <span key={i} className="text-yellow-500">★</span>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  {prompt.is_active ? (
                    <Badge className="bg-green-500">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {new Date(prompt.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleActive(prompt.id, prompt.is_active)}
                    >
                      {prompt.is_active ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(prompt)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setDeletePromptId(prompt.id);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingPrompt ? "Edit Prompt" : "Add New Prompt"}
            </DialogTitle>
            <DialogDescription>
              Create or update a cinematic portrait prompt for the community
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prompt">Prompt *</Label>
              <Textarea
                id="prompt"
                placeholder="Cinematic close-up portrait of a weathered fisherman..."
                value={formData.prompt}
                onChange={(e) =>
                  setFormData({ ...formData, prompt: e.target.value })
                }
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quality">Quality Score</Label>
                <Select
                  value={formData.quality_score.toString()}
                  onValueChange={(value) =>
                    setFormData({ ...formData, quality_score: parseInt(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((score) => (
                      <SelectItem key={score} value={score.toString()}>
                        {Array.from({ length: score }).map((_, i) => (
                          <span key={i}>★</span>
                        ))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Select
                value={formData.source}
                onValueChange={(value) =>
                  setFormData({ ...formData, source: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="curated">Curated</SelectItem>
                  <SelectItem value="community">Community</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingPrompt ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Prompt</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this prompt? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
