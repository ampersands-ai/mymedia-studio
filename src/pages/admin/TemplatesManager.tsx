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
import { TemplateFormDialog } from "@/components/admin/TemplateFormDialog";

interface ContentTemplate {
  id: string;
  category: string;
  name: string;
  description: string | null;
  model_id: string | null;
  preset_parameters: any;
  enhancement_instruction: string | null;
  thumbnail_url: string | null;
  is_active: boolean;
  display_order: number;
}

export default function TemplatesManager() {
  const [templates, setTemplates] = useState<ContentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ContentTemplate | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("content_templates")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const toggleTemplateStatus = async (
    templateId: string,
    currentStatus: boolean
  ) => {
    try {
      const { error } = await supabase
        .from("content_templates")
        .update({ is_active: !currentStatus })
        .eq("id", templateId);

      if (error) throw error;

      toast.success(`Template ${!currentStatus ? "enabled" : "disabled"}`);
      fetchTemplates();
    } catch (error) {
      console.error("Error toggling template status:", error);
      toast.error("Failed to update template status");
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this template? This cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("content_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;
      
      toast.success("Template deleted successfully");
      fetchTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
    }
  };

  const handleEdit = (template: ContentTemplate) => {
    setEditingTemplate(template);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingTemplate(null);
    setDialogOpen(true);
  };

  const handleSuccess = () => {
    setDialogOpen(false);
    setEditingTemplate(null);
    fetchTemplates();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading templates...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black mb-2">Content Templates</h1>
          <p className="text-muted-foreground">
            Manage pre-configured templates for users
          </p>
        </div>
        <Button
          onClick={handleAdd}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold border-3 border-black brutal-shadow"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Template
        </Button>
      </div>

      <Card className="border-3 border-black brutal-shadow">
        <CardHeader>
          <CardTitle>All Templates ({templates.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                No templates configured yet
              </p>
              <Button
                onClick={handleAdd}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold border-3 border-black brutal-shadow"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Template
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold">Template ID</TableHead>
                  <TableHead className="font-bold">Name</TableHead>
                  <TableHead className="font-bold">Category</TableHead>
                  <TableHead className="font-bold">Model</TableHead>
                  <TableHead className="font-bold">Order</TableHead>
                  <TableHead className="font-bold">Status</TableHead>
                  <TableHead className="font-bold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-mono text-sm">
                      {template.id}
                    </TableCell>
                    <TableCell className="font-medium">
                      {template.name}
                    </TableCell>
                    <TableCell>{template.category}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {template.model_id || "N/A"}
                    </TableCell>
                    <TableCell>{template.display_order}</TableCell>
                    <TableCell>
                      {template.is_active ? (
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
                          onClick={() => handleEdit(template)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            toggleTemplateStatus(
                              template.id,
                              template.is_active
                            )
                          }
                        >
                          {template.is_active ? (
                            <PowerOff className="h-4 w-4" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(template.id)}
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

      <TemplateFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        template={editingTemplate}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
