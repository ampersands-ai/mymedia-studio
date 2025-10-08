import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Power, PowerOff, Trash2, ArrowUpDown, Copy } from "lucide-react";
import { toast } from "sonner";
import { ModelFormDialog } from "@/components/admin/ModelFormDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CREATION_GROUPS = [
  { id: "image_editing", label: "Image Editing" },
  { id: "prompt_to_image", label: "Prompt to Image" },
  { id: "prompt_to_video", label: "Prompt to Video" },
  { id: "image_to_video", label: "Image to Video" },
  { id: "prompt_to_audio", label: "Prompt to Audio" },
];

interface AIModel {
  record_id: string;
  id: string;
  provider: string;
  model_name: string;
  content_type: string;
  base_token_cost: number;
  cost_multipliers: any;
  input_schema: any;
  api_endpoint: string | null;
  is_active: boolean;
  groups?: any; // Json type from Supabase
  payload_structure?: string;
  max_images?: number | null;
}

export default function AIModelsManager() {
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<AIModel | null>(null);
  const [sortBy, setSortBy] = useState<string>("cost");

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const { data, error } = await supabase
        .from("ai_models")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        // Check if it's an RLS policy error
        const isRLSError = error.code === 'PGRST301' || 
                          error.message?.includes('row-level security') ||
                          error.message?.includes('policy');
        
        if (isRLSError) {
          toast.error("Access denied. Please ensure you have admin privileges.");
          console.error("RLS policy blocked access:", error);
        } else {
          throw error;
        }
        return;
      }
      
      setModels(data || []);
    } catch (error) {
      console.error("Error fetching models:", error);
      toast.error("Failed to load AI models");
    } finally {
      setLoading(false);
    }
  };

  const toggleModelStatus = async (recordId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("ai_models")
        .update({ is_active: !currentStatus })
        .eq("record_id", recordId);

      if (error) throw error;
      
      toast.success(`Model ${!currentStatus ? "enabled" : "disabled"}`);
      fetchModels();
    } catch (error) {
      console.error("Error toggling model status:", error);
      toast.error("Failed to update model status");
    }
  };

  const handleDelete = async (recordId: string) => {
    if (!confirm("Are you sure you want to delete this model? This cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("ai_models")
        .delete()
        .eq("record_id", recordId);

      if (error) throw error;
      
      toast.success("Model deleted successfully");
      fetchModels();
    } catch (error) {
      console.error("Error deleting model:", error);
      toast.error("Failed to delete model");
    }
  };

  const handleEdit = (model: AIModel) => {
    setEditingModel(model);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingModel(null);
    setDialogOpen(true);
  };

  const handleDuplicate = (model: AIModel) => {
    // Create a copy without the record_id to create a new model
    const duplicateModel = {
      ...model,
      record_id: '', // Clear to force creation of new model
      id: `${model.id}-copy`, // Suggest a new ID
      model_name: `${model.model_name} (Copy)`,
    } as AIModel;
    setEditingModel(duplicateModel);
    setDialogOpen(true);
  };

  const handleSuccess = () => {
    setDialogOpen(false);
    setEditingModel(null);
    fetchModels();
  };

  const handleEnableAll = async () => {
    try {
      const { error } = await supabase
        .from("ai_models")
        .update({ is_active: true })
        .neq("is_active", true);

      if (error) throw error;
      toast.success("All models enabled");
      fetchModels();
    } catch (error) {
      console.error("Error enabling all models:", error);
      toast.error("Failed to enable all models");
    }
  };

  const handleDisableAll = async () => {
    if (!confirm("Are you sure you want to disable all models?")) return;

    try {
      const { error } = await supabase
        .from("ai_models")
        .update({ is_active: false })
        .eq("is_active", true);

      if (error) throw error;
      toast.success("All models disabled");
      fetchModels();
    } catch (error) {
      console.error("Error disabling all models:", error);
      toast.error("Failed to disable all models");
    }
  };

  const sortedModels = [...models].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.model_name.localeCompare(b.model_name);
      case "provider":
        return a.provider.localeCompare(b.provider);
      case "type":
        return a.content_type.localeCompare(b.content_type);
      case "cost":
        return a.base_token_cost - b.base_token_cost;
      case "status":
        return (a.is_active === b.is_active) ? 0 : a.is_active ? -1 : 1;
      case "created_at":
      default:
        return 0; // Already sorted by created_at from query
    }
  });

  // No loading state - render immediately
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black mb-2">AI MODELS</h1>
          <p className="text-muted-foreground">
            Manage AI models, providers, and token costs
          </p>
        </div>
        <Button
          onClick={handleAdd}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold border-3 border-black brutal-shadow"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Model
        </Button>
      </div>

      <Card className="border-3 border-black brutal-shadow">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>All Models ({models.length})</CardTitle>
            <div className="flex gap-2 items-center">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Recently Added</SelectItem>
                  <SelectItem value="name">Model Name</SelectItem>
                  <SelectItem value="provider">Provider</SelectItem>
                  <SelectItem value="type">Content Type</SelectItem>
                  <SelectItem value="cost">Base Cost</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={handleEnableAll}
                className="border-2"
              >
                <Power className="h-4 w-4 mr-2" />
                Enable All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisableAll}
                className="border-2"
              >
                <PowerOff className="h-4 w-4 mr-2" />
                Disable All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {models.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                No AI models configured yet
              </p>
              <Button
                onClick={handleAdd}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold border-3 border-black brutal-shadow"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Model
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold">Model ID</TableHead>
                  <TableHead className="font-bold">Provider</TableHead>
                  <TableHead className="font-bold">Model Name</TableHead>
                  <TableHead className="font-bold">Type</TableHead>
                  <TableHead className="font-bold">Structure</TableHead>
                  <TableHead className="font-bold">Groups</TableHead>
                  <TableHead className="font-bold">Base Cost</TableHead>
                  <TableHead className="font-bold">Max Images</TableHead>
                  <TableHead className="font-bold">Status</TableHead>
                  <TableHead className="font-bold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedModels.map((model) => (
                  <TableRow key={model.record_id}>
                    <TableCell className="font-mono text-sm">
                      {model.id}
                    </TableCell>
                    <TableCell className="font-medium">
                      {model.provider}
                    </TableCell>
                    <TableCell>{model.model_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{model.content_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={(model as any).payload_structure === 'flat' ? 'secondary' : 'outline'}>
                        {(model as any).payload_structure === 'flat' ? 'Flat' : 'Wrapper'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(Array.isArray(model.groups) ? model.groups : []).map((group: string) => (
                          <Badge key={group} variant="secondary" className="text-xs">
                            {CREATION_GROUPS.find(g => g.id === group)?.label || group}
                          </Badge>
                        ))}
                        {(!model.groups || (Array.isArray(model.groups) && model.groups.length === 0)) && (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-bold">
                      {model.base_token_cost} tokens
                    </TableCell>
                    <TableCell>
                      {model.max_images ? (
                        <Badge variant="outline">{model.max_images} max</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Unlimited</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {model.is_active ? (
                        <Badge className="bg-green-500">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEdit(model)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDuplicate(model)}
                          title="Duplicate model"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            toggleModelStatus(model.record_id, model.is_active)
                          }
                        >
                          {model.is_active ? (
                            <PowerOff className="h-4 w-4" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(model.record_id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ModelFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        model={editingModel}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
