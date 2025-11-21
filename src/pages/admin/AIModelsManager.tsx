import { useEffect, useState } from "react";
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
import {
  Plus, Edit, Power, PowerOff, ArrowUpDown, Copy, Filter, X,
  FileText, Download, Lock, Unlock, AlertCircle, RefreshCw
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { ModelConfiguration } from "@/types/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  getAllModels,
  type ModelModule,
  getGenerationType
} from "@/lib/models/registry";
import {
  generateModelUpdateScript,
  generateNewModelScript,
  generateModelDeleteScript,
  generateLockToggleScript,
  downloadScript,
  getLockStatuses,
  type ModelUpdatePayload
} from "@/lib/admin/modelFileEditor";
import { ModelFormDialog } from "@/components/admin/ModelFormDialog";

const CREATION_GROUPS = [
  { id: "image_editing", label: "Image Editing" },
  { id: "prompt_to_image", label: "Text to Image" },
  { id: "prompt_to_video", label: "Text to Video" },
  { id: "image_to_video", label: "Image to Video" },
  { id: "prompt_to_audio", label: "Audio Studio" },
];

type AIModel = ModelConfiguration;

/**
 * Convert ModelModule to ModelConfiguration for UI compatibility
 */
function moduleToModel(module: ModelModule): AIModel {
  const config = module.MODEL_CONFIG;

  return {
    record_id: config.recordId,
    id: config.modelId,
    provider: config.provider,
    model_name: config.modelName,
    content_type: config.contentType,
    base_token_cost: config.baseCreditCost,
    cost_multipliers: config.costMultipliers || null,
    input_schema: module.SCHEMA || null,
    api_endpoint: config.apiEndpoint,
    payload_structure: config.payloadStructure,
    max_images: config.maxImages,
    estimated_time_seconds: config.estimatedTimeSeconds,
    default_outputs: config.defaultOutputs,
    is_active: config.isActive,
    groups: [config.contentType], // Groups array for filtering
    logo_url: config.logoUrl || null,
    model_family: config.modelFamily || null,
    variant_name: config.variantName || null,
    display_order_in_family: config.displayOrderInFamily || null,
    is_locked: config.isLocked,
    locked_file_path: config.lockedFilePath,
    locked_at: null,
    locked_by: null,
  } as AIModel;
}

export default function AIModelsManager() {
  const [models, setModels] = useState<AIModel[]>([]);
  const [lockStatuses, setLockStatuses] = useState<Record<string, boolean>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<AIModel | null>(null);
  const [pendingChanges, setPendingChanges] = useState<ModelUpdatePayload[]>([]);
  const [sortBy, setSortBy] = useState<string>("cost");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    provider: "all",
    contentType: "all",
    structure: "all",
    status: "all",
    group: "all",
    lockStatus: "all"
  });

  useEffect(() => {
    fetchModels();
    fetchLockStatuses();
  }, []);

  const fetchModels = () => {
    try {
      const modules = getAllModels();
      const modelConfigs = modules.map(moduleToModel);
      setModels(modelConfigs);
      logger.debug(`Loaded ${modelConfigs.length} models from registry`);
    } catch (error) {
      logger.error("Failed to load models from registry", error as Error, {
        component: 'AIModelsManager',
        operation: 'fetchModels'
      });
      toast.error("Failed to load AI models from registry");
    }
  };

  const fetchLockStatuses = () => {
    try {
      const statuses = getLockStatuses();
      setLockStatuses(statuses);
    } catch (error) {
      logger.error("Failed to fetch lock statuses", error as Error);
    }
  };

  const handleRefresh = () => {
    fetchModels();
    fetchLockStatuses();
    toast.success("Refreshed models from registry");
  };

  const handleEdit = (model: AIModel) => {
    if (model.is_locked) {
      toast.error("Cannot edit locked model. Unlock it first.");
      return;
    }
    setEditingModel(model);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingModel(null);
    setDialogOpen(true);
  };

  const handleDuplicate = (model: AIModel) => {
    const duplicateModel = {
      ...model,
      record_id: '', // Will be generated
      id: `${model.id}-copy`,
      model_name: `${model.model_name} (Copy)`,
      is_locked: false, // New models are never locked
    } as AIModel;
    setEditingModel(duplicateModel);
    setDialogOpen(true);
  };

  const handleSaveChanges = (updatedModel: AIModel) => {
    if (updatedModel.record_id) {
      // Existing model - add to pending changes
      const existingIndex = pendingChanges.findIndex(
        c => c.recordId === updatedModel.record_id
      );

      const updates: ModelUpdatePayload = {
        recordId: updatedModel.record_id,
        updates: {
          id: updatedModel.id,
          model_name: updatedModel.model_name,
          provider: updatedModel.provider,
          content_type: updatedModel.content_type,
          base_token_cost: updatedModel.base_token_cost,
          cost_multipliers: updatedModel.cost_multipliers,
          input_schema: updatedModel.input_schema,
          api_endpoint: updatedModel.api_endpoint,
          payload_structure: updatedModel.payload_structure,
          max_images: updatedModel.max_images,
          estimated_time_seconds: updatedModel.estimated_time_seconds,
          default_outputs: updatedModel.default_outputs,
          is_active: updatedModel.is_active,
          logo_url: updatedModel.logo_url,
          model_family: updatedModel.model_family,
          variant_name: updatedModel.variant_name,
          display_order_in_family: updatedModel.display_order_in_family,
        }
      };

      if (existingIndex >= 0) {
        const newChanges = [...pendingChanges];
        newChanges[existingIndex] = updates;
        setPendingChanges(newChanges);
      } else {
        setPendingChanges([...pendingChanges, updates]);
      }

      toast.success(`Changes queued for ${updatedModel.model_name}. Download update script to apply.`);
    } else {
      // New model - generate creation script
      const script = generateNewModelScript(updatedModel);
      downloadScript(script, `create-${updatedModel.model_name.replace(/[^a-zA-Z0-9]/g, '_')}.cjs`);
      toast.success("Model creation script downloaded. Run it to create the model file.");
    }

    setDialogOpen(false);
    setEditingModel(null);
  };

  const handleToggleStatus = (recordId: string, currentStatus: boolean) => {
    const model = models.find(m => m.record_id === recordId);
    if (!model) return;

    const updates: ModelUpdatePayload = {
      recordId,
      updates: { is_active: !currentStatus }
    };

    setPendingChanges([...pendingChanges, updates]);
    toast.success(`Status change queued for ${model.model_name}. Download update script to apply.`);
  };

  const handleDelete = (recordId: string) => {
    const model = models.find(m => m.record_id === recordId);
    if (!model) return;

    if (!confirm(`This will deactivate ${model.model_name} (set is_active: false). Continue?`)) {
      return;
    }

    const updates: ModelUpdatePayload = {
      recordId,
      updates: { is_active: false }
    };

    setPendingChanges([...pendingChanges, updates]);
    toast.success("Deactivation queued. Download update script to apply.");
  };

  const handleToggleLock = (recordId: string, currentLockStatus: boolean) => {
    const script = generateLockToggleScript(recordId, !currentLockStatus);
    const action = currentLockStatus ? "unlock" : "lock";
    downloadScript(script, `${action}-model-${recordId.slice(0, 8)}.cjs`);
    toast.success(`${action} script downloaded. Run it to ${action} the model.`);
  };

  const handleDownloadPendingChanges = () => {
    if (pendingChanges.length === 0) {
      toast.error("No pending changes to download");
      return;
    }

    const script = generateModelUpdateScript(pendingChanges);
    downloadScript(script, `update-models-${Date.now()}.cjs`);
    toast.success(`Update script downloaded with ${pendingChanges.length} changes`);
    setPendingChanges([]); // Clear pending changes after download
  };

  const handleClearPendingChanges = () => {
    setPendingChanges([]);
    toast.success("Pending changes cleared");
  };

  const handleEnableAll = () => {
    const inactiveModels = models.filter(m => !m.is_active);

    if (inactiveModels.length === 0) {
      toast.info("All models are already active");
      return;
    }

    const bulkUpdates = inactiveModels.map(m => ({
      recordId: m.record_id,
      updates: { is_active: true }
    }));

    setPendingChanges([...pendingChanges, ...bulkUpdates]);
    toast.success(`Queued ${bulkUpdates.length} models to enable. Download update script.`);
  };

  const handleDisableAll = () => {
    if (!confirm("Disable all active models? This will generate a script to update TypeScript files.")) return;

    const activeModels = models.filter(m => m.is_active);
    const bulkUpdates = activeModels.map(m => ({
      recordId: m.record_id,
      updates: { is_active: false }
    }));

    setPendingChanges([...pendingChanges, ...bulkUpdates]);
    toast.success(`Queued ${bulkUpdates.length} models to disable. Download update script.`);
  };

  // Filter models
  const filteredModels = models.filter((model) => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch =
        model.id.toLowerCase().includes(searchLower) ||
        model.model_name.toLowerCase().includes(searchLower) ||
        model.provider.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    if (filters.provider !== "all" && model.provider !== filters.provider) {
      return false;
    }

    if (filters.contentType !== "all" && model.content_type !== filters.contentType) {
      return false;
    }

    if (filters.structure !== "all" && model.payload_structure !== filters.structure) {
      return false;
    }

    if (filters.status === "active" && !model.is_active) return false;
    if (filters.status === "inactive" && model.is_active) return false;

    if (filters.lockStatus === "locked" && !model.is_locked) return false;
    if (filters.lockStatus === "unlocked" && model.is_locked) return false;

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
      default:
        return 0;
    }
  });

  const clearFilters = () => {
    setFilters({
      search: "",
      provider: "all",
      contentType: "all",
      structure: "all",
      status: "all",
      group: "all",
      lockStatus: "all"
    });
  };

  const hasActiveFilters =
    filters.search !== "" ||
    filters.provider !== "all" ||
    filters.contentType !== "all" ||
    filters.structure !== "all" ||
    filters.status !== "all" ||
    filters.group !== "all" ||
    filters.lockStatus !== "all";

  const uniqueProviders = [...new Set(models.map(m => m.provider))];
  const uniqueContentTypes = [...new Set(models.map(m => m.content_type))];
  const uniqueStructures = [...new Set(models.map(m => m.payload_structure || 'wrapper'))];
  const allGroups = [...new Set(models.flatMap(m => Array.isArray(m.groups) ? m.groups : []))];

  return (
    <div className="space-y-6">
      {/* Info Alert */}
      <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900 dark:text-blue-100">Registry-Based Model Management</AlertTitle>
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          Models are loaded from <code className="font-mono text-xs bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded">src/lib/models/locked/</code> TypeScript files.
          Changes generate migration scripts that you download and run locally to update the files.
          Locked models cannot be modified.
        </AlertDescription>
      </Alert>

      {/* Pending Changes Alert */}
      {pendingChanges.length > 0 && (
        <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950">
          <Download className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-900 dark:text-orange-100">
            {pendingChanges.length} Pending Change{pendingChanges.length > 1 ? 's' : ''}
          </AlertTitle>
          <AlertDescription className="text-orange-800 dark:text-orange-200 flex items-center gap-2">
            <span className="flex-1">
              Download and run the update script to apply your changes to model files.
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleDownloadPendingChanges}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                <Download className="h-3 w-3 mr-2" />
                Download Script
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleClearPendingChanges}
              >
                Clear
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black mb-2">AI MODELS (REGISTRY)</h1>
          <p className="text-muted-foreground">
            Manage AI models from TypeScript source files • {models.length} models loaded
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="border-2"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={handleAdd}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold border-3 border-black brutal-shadow"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Model
          </Button>
        </div>
      </div>

      <Card className="border-3 border-black brutal-shadow">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              All Models ({filteredModels.length}{filteredModels.length !== models.length && ` of ${models.length}`})
            </CardTitle>
            <div className="flex gap-2 items-center flex-wrap">
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
                  <SelectItem value="name">Model Name</SelectItem>
                  <SelectItem value="provider">Provider</SelectItem>
                  <SelectItem value="type">Content Type</SelectItem>
                  <SelectItem value="cost">Base Cost</SelectItem>
                  <SelectItem value="duration">Duration</SelectItem>
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
              {pendingChanges.length > 0 && (
                <Button
                  onClick={handleDownloadPendingChanges}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-bold"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download ({pendingChanges.length})
                </Button>
              )}
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

                <div className="space-y-2">
                  <Label htmlFor="lockStatus" className="text-xs">Lock Status</Label>
                  <Select
                    value={filters.lockStatus}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, lockStatus: value }))}
                  >
                    <SelectTrigger id="lockStatus" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="locked">Locked</SelectItem>
                      <SelectItem value="unlocked">Unlocked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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
                    No models found in registry
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Lock</TableHead>
                    <TableHead className="font-bold">Record ID</TableHead>
                    <TableHead className="font-bold">Model ID</TableHead>
                    <TableHead className="font-bold">Provider</TableHead>
                    <TableHead className="font-bold">Family</TableHead>
                    <TableHead className="font-bold">Model Name</TableHead>
                    <TableHead className="font-bold">Type</TableHead>
                    <TableHead className="font-bold">Base Cost</TableHead>
                    <TableHead className="font-bold">Order</TableHead>
                    <TableHead className="font-bold">Status</TableHead>
                    <TableHead className="font-bold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedModels.map((model) => (
                    <TableRow key={model.record_id} className={model.is_locked ? "bg-muted/30" : ""}>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleLock(model.record_id, model.is_locked)}
                          title={model.is_locked ? "Download unlock script" : "Download lock script"}
                        >
                          {model.is_locked ? (
                            <Lock className="h-4 w-4 text-red-500" />
                          ) : (
                            <Unlock className="h-4 w-4 text-green-500" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground" title={model.record_id}>
                        {model.record_id.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {model.id}
                      </TableCell>
                      <TableCell className="font-medium">
                        {model.provider}
                      </TableCell>
                      <TableCell>
                        {model.model_family ? (
                          <Badge variant="outline">{model.model_family}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {model.model_name}
                        {model.variant_name && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ({model.variant_name})
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{model.content_type}</Badge>
                      </TableCell>
                      <TableCell className="font-bold">
                        {model.base_token_cost} credits
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {model.display_order_in_family ?? '-'}
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
                            title="Edit model (generates update script)"
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
                              handleToggleStatus(model.record_id, model.is_active)
                            }
                            title="Toggle status (generates update script)"
                          >
                            {model.is_active ? (
                              <PowerOff className="h-4 w-4" />
                            ) : (
                              <Power className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ModelFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        model={editingModel}
        onSuccess={handleSaveChanges as any}
      />
    </div>
  );
}
