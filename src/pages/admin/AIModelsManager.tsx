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
import { Plus, Edit, Power, PowerOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ModelFormDialog } from "@/components/admin/ModelFormDialog";

interface AIModel {
  id: string;
  provider: string;
  model_name: string;
  content_type: string;
  base_token_cost: number;
  cost_multipliers: any;
  input_schema: any;
  api_endpoint: string | null;
  is_active: boolean;
}

export default function AIModelsManager() {
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<AIModel | null>(null);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const { data, error } = await supabase
        .from("ai_models")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setModels(data || []);
    } catch (error) {
      console.error("Error fetching models:", error);
      toast.error("Failed to load AI models");
    } finally {
      setLoading(false);
    }
  };

  const toggleModelStatus = async (modelId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("ai_models")
        .update({ is_active: !currentStatus })
        .eq("id", modelId);

      if (error) throw error;
      
      toast.success(`Model ${!currentStatus ? "enabled" : "disabled"}`);
      fetchModels();
    } catch (error) {
      console.error("Error toggling model status:", error);
      toast.error("Failed to update model status");
    }
  };

  const handleDelete = async (modelId: string) => {
    if (!confirm("Are you sure you want to delete this model? This cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("ai_models")
        .delete()
        .eq("id", modelId);

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

  const handleSuccess = () => {
    setDialogOpen(false);
    setEditingModel(null);
    fetchModels();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading models...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black mb-2">AI Models</h1>
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
          <CardTitle>All Models ({models.length})</CardTitle>
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
                  <TableHead className="font-bold">Base Cost</TableHead>
                  <TableHead className="font-bold">Status</TableHead>
                  <TableHead className="font-bold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.map((model) => (
                  <TableRow key={model.id}>
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
                    <TableCell className="font-bold">
                      {model.base_token_cost} tokens
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
                          onClick={() =>
                            toggleModelStatus(model.id, model.is_active)
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
                          onClick={() => handleDelete(model.id)}
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
