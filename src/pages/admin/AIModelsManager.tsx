import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
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
import { Plus, Edit, Power, PowerOff, Trash2, ArrowUpDown, Copy, Filter, X, FileText, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ModelFormDialog } from "@/components/admin/ModelFormDialog";
import type { ModelConfiguration } from "@/types/schema";
import { jsonToSchema } from "@/types/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DocumentationViewer } from "@/components/admin/DocumentationViewer";

const CREATION_GROUPS = [
  { id: "image_editing", label: "Image Editing" },
  { id: "prompt_to_image", label: "Text to Image" },
  { id: "prompt_to_video", label: "Text to Video" },
  { id: "image_to_video", label: "Image to Video" },
  { id: "prompt_to_audio", label: "Audio Studio" },
];

type AIModel = ModelConfiguration;

export default function AIModelsManager() {
  const [models, setModels] = useState<AIModel[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<AIModel | null>(null);
  const [sortBy, setSortBy] = useState<string>("cost");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    provider: "all",
    contentType: "all",
    structure: "all",
    status: "all",
    group: "all"
  });
  const [docStatus, setDocStatus] = useState<Record<string, { exists: boolean; last_updated: string; generation_count: number }>>({});
  const [generatingDocs, setGeneratingDocs] = useState<string | null>(null);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [docsProgress, setDocsProgress] = useState(0);
  const [selectedDocumentation, setSelectedDocumentation] = useState<any>(null);
  const [docViewerOpen, setDocViewerOpen] = useState(false);

  useEffect(() => {
    fetchModels();
    fetchDocumentationStatus();
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
          logger.error("RLS policy blocked access to AI models", error as Error, { 
            component: 'AIModelsManager',
            operation: 'fetchModels',
            errorCode: error.code
          });
        } else {
          throw error;
        }
        return;
      }
      
      // Convert Supabase Json types to our typed structures
      const typedModels: AIModel[] = (data || []).map(model => ({
        ...model,
        input_schema: jsonToSchema(model.input_schema),
        cost_multipliers: typeof model.cost_multipliers === 'object' && model.cost_multipliers !== null 
          ? model.cost_multipliers as Record<string, number>
          : null,
        payload_structure: (model.payload_structure === 'flat' || model.payload_structure === 'wrapper')
          ? model.payload_structure
          : 'wrapper',
        groups: Array.isArray(model.groups) 
          ? model.groups.filter((g): g is string => typeof g === 'string')
          : undefined
      }));
      
      setModels(typedModels);
    } catch (error) {
      logger.error("Failed to fetch AI models", error as Error, {
        component: 'AIModelsManager',
        operation: 'fetchModels'
      });
      toast.error("Failed to load AI models");
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
      logger.error("Failed to toggle model status", error as Error, { 
        component: 'AIModelsManager',
        operation: 'toggleModelStatus',
        recordId,
        currentStatus
      });
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
      logger.error("Failed to delete model", error as Error, { 
        component: 'AIModelsManager',
        operation: 'handleDelete',
        recordId
      });
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
      logger.error("Failed to enable all models", error as Error, { 
        component: 'AIModelsManager',
        operation: 'handleEnableAll'
      });
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
      logger.error("Failed to disable all models", error as Error, { 
        component: 'AIModelsManager',
        operation: 'handleDisableAll'
      });
      toast.error("Failed to disable all models");
    }
  };

  const fetchDocumentationStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('model_documentation')
        .select('model_record_id, last_analyzed_at, analyzed_generations_count');

      if (error) throw error;

      const statusMap: Record<string, { exists: boolean; last_updated: string; generation_count: number }> = {};
      data?.forEach((doc) => {
        statusMap[doc.model_record_id] = {
          exists: true,
          last_updated: doc.last_analyzed_at,
          generation_count: doc.analyzed_generations_count
        };
      });
      setDocStatus(statusMap);
    } catch (error) {
      logger.error("Failed to fetch documentation status", error as Error);
    }
  };

  const handleGenerateDocumentation = async (modelRecordId: string) => {
    setGeneratingDocs(modelRecordId);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-model-docs', {
        body: { model_record_id: modelRecordId, regenerate: true }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(data.message);
        await fetchDocumentationStatus();
      } else {
        toast.error(data.message || 'Failed to generate documentation');
      }
    } catch (error) {
      logger.error("Failed to generate documentation", error as Error);
      toast.error("Failed to generate documentation");
    } finally {
      setGeneratingDocs(null);
    }
  };

  const handleViewDocumentation = async (modelRecordId: string) => {
    try {
      const { data, error } = await supabase
        .from('model_documentation')
        .select('*')
        .eq('model_record_id', modelRecordId)
        .single();

      if (error) throw error;

      setSelectedDocumentation(data);
      setDocViewerOpen(true);
    } catch (error) {
      logger.error("Failed to fetch documentation", error as Error);
      toast.error("Failed to load documentation");
    }
  };

  const handleGenerateAllActiveDocs = async () => {
    const activeModels = sortedModels.filter(m => m.is_active);
    const kieModels = activeModels.filter(m => m.provider === 'kie-ai');
    const runwareModels = activeModels.filter(m => m.provider === 'runware');
    const prioritizedModels = [...kieModels, ...runwareModels];

    setBulkGenerating(true);
    setDocsProgress(0);

    for (let i = 0; i < prioritizedModels.length; i += 3) {
      const batch = prioritizedModels.slice(i, i + 3);
      await Promise.all(
        batch.map(async (model) => {
          try {
            await supabase.functions.invoke('analyze-model-docs', {
              body: { model_record_id: model.record_id }
            });
          } catch (error) {
            logger.error(`Failed to generate docs for ${model.model_name}`, error as Error);
          }
        })
      );
      setDocsProgress(i + batch.length);
    }

    await fetchDocumentationStatus();
    setBulkGenerating(false);
    setDocsProgress(0);
    toast.success(`Generated documentation for ${prioritizedModels.length} models`);
  };

  const getDocStatusBadge = (modelRecordId: string) => {
    const status = docStatus[modelRecordId];
    if (!status?.exists) return null;

    const daysSinceUpdate = (Date.now() - new Date(status.last_updated).getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceUpdate < 7) {
      return <Badge variant="outline" className="text-green-600 border-green-600">📄 Fresh</Badge>;
    } else if (daysSinceUpdate < 30) {
      return <Badge variant="outline" className="text-yellow-600 border-yellow-600">📄 Stale</Badge>;
    } else {
      return <Badge variant="outline" className="text-red-600 border-red-600">📄 Old</Badge>;
    }
  };

  // Filter models
  const filteredModels = models.filter((model) => {
    // Search filter (model ID, name, provider)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = 
        model.id.toLowerCase().includes(searchLower) ||
        model.model_name.toLowerCase().includes(searchLower) ||
        model.provider.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }
    
    // Provider filter
    if (filters.provider !== "all" && model.provider !== filters.provider) {
      return false;
    }
    
    // Content type filter
    if (filters.contentType !== "all" && model.content_type !== filters.contentType) {
      return false;
    }
    
    // Structure filter
    if (filters.structure !== "all" && model.payload_structure !== filters.structure) {
      return false;
    }
    
    // Status filter
    if (filters.status === "active" && !model.is_active) return false;
    if (filters.status === "inactive" && model.is_active) return false;
    
    // Group filter
    if (filters.group !== "all") {
      const modelGroups = Array.isArray(model.groups) ? model.groups : [];
      if (!modelGroups.includes(filters.group)) return false;
    }
    
    return true;
  });

  const sortedModels = [...filteredModels].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.model_name.localeCompare(b.model_name);
      case "provider":
        return a.provider.localeCompare(b.provider);
      case "type":
        return a.content_type.localeCompare(b.content_type);
      case "cost":
        return a.base_token_cost - b.base_token_cost;
      case "duration": {
        const aDuration = a.estimated_time_seconds || 0;
        const bDuration = b.estimated_time_seconds || 0;
        return aDuration - bDuration;
      }
      case "status":
        return (a.is_active === b.is_active) ? 0 : a.is_active ? -1 : 1;
      case "created_at":
      default:
        return 0; // Already sorted by created_at from query
    }
  });

  const clearFilters = () => {
    setFilters({
      search: "",
      provider: "all",
      contentType: "all",
      structure: "all",
      status: "all",
      group: "all"
    });
  };

  const hasActiveFilters = 
    filters.search !== "" ||
    filters.provider !== "all" ||
    filters.contentType !== "all" ||
    filters.structure !== "all" ||
    filters.status !== "all" ||
    filters.group !== "all";

  // Get unique values for filter dropdowns
  const uniqueProviders = [...new Set(models.map(m => m.provider))];
  const uniqueContentTypes = [...new Set(models.map(m => m.content_type))];
  const uniqueStructures = [...new Set(models.map(m => m.payload_structure || 'wrapper'))];
  const allGroups = [...new Set(models.flatMap(m => Array.isArray(m.groups) ? m.groups : []))];

  // No loading state - render immediately
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black mb-2">AI MODELS</h1>
          <p className="text-muted-foreground">
            Manage AI models, providers, and credit costs
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
            <CardTitle>
              All Models ({filteredModels.length}{filteredModels.length !== models.length && ` of ${models.length}`})
            </CardTitle>
            <div className="flex gap-2 items-center">
              <Button
                variant={showFilters ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="border-2"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {hasActiveFilters && (
                  <Badge className="ml-2 bg-primary text-primary-foreground">
                    {Object.values(filters).filter(v => v !== "" && v !== "all").length}
                  </Badge>
                )}
              </Button>
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
                  <SelectItem value="duration">Duration (Fastest First)</SelectItem>
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
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateAllActiveDocs}
                disabled={bulkGenerating}
                className="border-2"
              >
                {bulkGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating {docsProgress}/{sortedModels.filter(m => m.is_active).length}
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Generate All Docs
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {showFilters && (
            <div className="mt-6 p-4 bg-muted/50 rounded-lg border-2 border-border space-y-4">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-bold">Filter Models</Label>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-auto py-1 px-2 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear All
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Search */}
                <div className="space-y-2">
                  <Label htmlFor="search" className="text-xs">Search</Label>
                  <Input
                    id="search"
                    placeholder="Model ID, name, or provider..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="h-9"
                  />
                </div>

                {/* Provider */}
                <div className="space-y-2">
                  <Label htmlFor="provider" className="text-xs">Provider</Label>
                  <Select
                    value={filters.provider}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, provider: value }))}
                  >
                    <SelectTrigger id="provider" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Providers</SelectItem>
                      {uniqueProviders.map(provider => (
                        <SelectItem key={provider} value={provider}>{provider}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Content Type */}
                <div className="space-y-2">
                  <Label htmlFor="contentType" className="text-xs">Content Type</Label>
                  <Select
                    value={filters.contentType}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, contentType: value }))}
                  >
                    <SelectTrigger id="contentType" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {uniqueContentTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Structure */}
                <div className="space-y-2">
                  <Label htmlFor="structure" className="text-xs">Structure</Label>
                  <Select
                    value={filters.structure}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, structure: value }))}
                  >
                    <SelectTrigger id="structure" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Structures</SelectItem>
                      {uniqueStructures.map(structure => (
                        <SelectItem key={structure} value={structure}>
                          {structure === 'flat' ? 'Flat' : 'Wrapper'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-xs">Status</Label>
                  <Select
                    value={filters.status}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger id="status" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Group */}
                <div className="space-y-2">
                  <Label htmlFor="group" className="text-xs">Group</Label>
                  <Select
                    value={filters.group}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, group: value }))}
                  >
                    <SelectTrigger id="group" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Groups</SelectItem>
                      {allGroups.map(group => (
                        <SelectItem key={group} value={group}>
                          {CREATION_GROUPS.find(g => g.id === group)?.label || group}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {filteredModels.length === 0 ? (
            <div className="text-center py-12">
              {hasActiveFilters ? (
                <>
                  <Filter className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">
                    No models match your filters
                  </p>
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    className="border-2"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear Filters
                  </Button>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold">Model ID</TableHead>
                  <TableHead className="font-bold">Provider</TableHead>
                  <TableHead className="font-bold">Family</TableHead>
                  <TableHead className="font-bold">Variant</TableHead>
                  <TableHead className="font-bold">Model Name</TableHead>
                  <TableHead className="font-bold">Type</TableHead>
                  <TableHead className="font-bold">Structure</TableHead>
                  <TableHead className="font-bold">Groups</TableHead>
                  <TableHead className="font-bold">Base Cost</TableHead>
                  <TableHead className="font-bold">Order</TableHead>
                  <TableHead className="font-bold">Status</TableHead>
                  <TableHead className="font-bold text-center">Documentation</TableHead>
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
                    <TableCell>
                      {(model as any).model_family ? (
                        <Badge variant="outline">{(model as any).model_family}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {(model as any).variant_name || (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
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
                      {model.base_token_cost} credits
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {(model as any).display_order_in_family ?? '-'}
                    </TableCell>
                    <TableCell>
                      {model.is_active ? (
                        <Badge className="bg-green-500">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 items-center">
                        {docStatus[model.record_id]?.exists ? (
                          <>
                            {getDocStatusBadge(model.record_id)}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDocumentation(model.record_id)}
                              className="h-7 text-xs"
                            >
                              View
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGenerateDocumentation(model.record_id)}
                            disabled={generatingDocs === model.record_id}
                            className="h-7 text-xs"
                          >
                            {generatingDocs === model.record_id ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <FileText className="h-3 w-3 mr-1" />
                                Generate
                              </>
                            )}
                          </Button>
                        )}
                      </div>
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

      <DocumentationViewer
        documentation={selectedDocumentation}
        open={docViewerOpen}
        onOpenChange={setDocViewerOpen}
        onRegenerate={handleGenerateDocumentation}
        isRegenerating={generatingDocs === selectedDocumentation?.model_record_id}
      />
    </div>
  );
}
