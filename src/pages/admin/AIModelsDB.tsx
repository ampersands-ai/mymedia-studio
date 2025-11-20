import { useState } from "react";
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
  Plus,
  Edit,
  Power,
  PowerOff,
  ArrowUpDown,
  Filter,
  X,
  RefreshCw,
  Trash2,
  Check,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  useAIModelsDB,
  useToggleModelStatus,
  useBulkUpdateModels,
  useUpdateAIModel,
  type AIModelDB,
} from "@/hooks/useAIModelsDB";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export default function AIModelsDB() {
  const { data: models = [], isLoading, refetch } = useAIModelsDB();
  const toggleStatus = useToggleModelStatus();
  const bulkUpdate = useBulkUpdateModels();
  const updateModel = useUpdateAIModel();

  const [sortBy, setSortBy] = useState<string>("name");
  const [showFilters, setShowFilters] = useState(false);
  const [editingModel, setEditingModel] = useState<AIModelDB | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [filters, setFilters] = useState({
    search: "",
    provider: "all",
    contentType: "all",
    status: "all",
  });

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

    if (filters.status === "active" && !model.is_active) return false;
    if (filters.status === "inactive" && model.is_active) return false;

    return true;
  });

  // Sort models
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
      case "status":
        return a.is_active === b.is_active ? 0 : a.is_active ? -1 : 1;
      default:
        return 0;
    }
  });

  const handleToggleStatus = async (recordId: string, currentStatus: boolean) => {
    await toggleStatus.mutateAsync({ recordId, isActive: !currentStatus });
  };

  const handleEnableAll = async () => {
    const inactiveModels = models.filter((m) => !m.is_active);
    if (inactiveModels.length === 0) {
      return;
    }

    await bulkUpdate.mutateAsync(
      inactiveModels.map((m) => ({
        recordId: m.record_id,
        updates: { is_active: true },
      }))
    );
  };

  const handleDisableAll = async () => {
    if (!confirm("Disable all active models?")) return;

    const activeModels = models.filter((m) => m.is_active);
    await bulkUpdate.mutateAsync(
      activeModels.map((m) => ({
        recordId: m.record_id,
        updates: { is_active: false },
      }))
    );
  };

  const handleEdit = (model: AIModelDB) => {
    setEditingModel(model);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingModel) return;

    await updateModel.mutateAsync({
      recordId: editingModel.record_id,
      updates: {
        model_name: editingModel.model_name,
        provider: editingModel.provider,
        content_type: editingModel.content_type,
        base_token_cost: editingModel.base_token_cost,
        is_active: editingModel.is_active,
        api_endpoint: editingModel.api_endpoint,
        payload_structure: editingModel.payload_structure,
        max_images: editingModel.max_images,
        estimated_time_seconds: editingModel.estimated_time_seconds,
        default_outputs: editingModel.default_outputs,
        logo_url: editingModel.logo_url,
        model_family: editingModel.model_family,
        variant_name: editingModel.variant_name,
        display_order_in_family: editingModel.display_order_in_family,
      },
    });

    setDialogOpen(false);
    setEditingModel(null);
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      provider: "all",
      contentType: "all",
      status: "all",
    });
  };

  const hasActiveFilters =
    filters.search !== "" ||
    filters.provider !== "all" ||
    filters.contentType !== "all" ||
    filters.status !== "all";

  const uniqueProviders = [...new Set(models.map((m) => m.provider))];
  const uniqueContentTypes = [...new Set(models.map((m) => m.content_type))];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Alert */}
      <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
        <Check className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-900 dark:text-green-100">
          Database-Backed Model Management
        </AlertTitle>
        <AlertDescription className="text-green-800 dark:text-green-200">
          Direct database editing enabled. Changes take effect immediately. All models are
          stored in the <code className="font-mono text-xs bg-green-100 dark:bg-green-900 px-1 py-0.5 rounded">ai_models</code> table.
        </AlertDescription>
      </Alert>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black mb-2">AI MODELS (DATABASE)</h1>
          <p className="text-muted-foreground">
            Direct database management • {models.length} models • Instant updates
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => refetch()} variant="outline" className="border-2">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Card className="border-3 border-black brutal-shadow">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              All Models ({filteredModels.length}
              {filteredModels.length !== models.length && ` of ${models.length}`})
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
                    {Object.values(filters).filter((v) => v !== "" && v !== "all").length}
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
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={handleEnableAll}
                className="border-2"
                disabled={bulkUpdate.isPending}
              >
                <Power className="h-4 w-4 mr-2" />
                Enable All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisableAll}
                className="border-2"
                disabled={bulkUpdate.isPending}
              >
                <PowerOff className="h-4 w-4 mr-2" />
                Disable All
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search" className="text-xs">
                    Search
                  </Label>
                  <Input
                    id="search"
                    placeholder="Model ID, name, or provider..."
                    value={filters.search}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, search: e.target.value }))
                    }
                    className="h-9"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="provider" className="text-xs">
                    Provider
                  </Label>
                  <Select
                    value={filters.provider}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, provider: value }))
                    }
                  >
                    <SelectTrigger id="provider" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Providers</SelectItem>
                      {uniqueProviders.map((provider) => (
                        <SelectItem key={provider} value={provider}>
                          {provider}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contentType" className="text-xs">
                    Content Type
                  </Label>
                  <Select
                    value={filters.contentType}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, contentType: value }))
                    }
                  >
                    <SelectTrigger id="contentType" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {uniqueContentTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status" className="text-xs">
                    Status
                  </Label>
                  <Select
                    value={filters.status}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, status: value }))
                    }
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
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {filteredModels.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No models found</p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters} className="border-2">
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Record ID</TableHead>
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
                  {sortedModels.map((model) => (
                    <TableRow key={model.record_id}>
                      <TableCell
                        className="font-mono text-xs text-muted-foreground"
                        title={model.record_id}
                      >
                        {model.record_id.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="font-mono text-sm">{model.id}</TableCell>
                      <TableCell className="font-medium">{model.provider}</TableCell>
                      <TableCell>{model.model_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{model.content_type}</Badge>
                      </TableCell>
                      <TableCell className="font-bold">
                        {model.base_token_cost} credits
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={model.is_active}
                          onCheckedChange={() =>
                            handleToggleStatus(model.record_id, model.is_active)
                          }
                          disabled={toggleStatus.isPending}
                        />
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

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Model</DialogTitle>
          </DialogHeader>
          {editingModel && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-model-name">Model Name</Label>
                  <Input
                    id="edit-model-name"
                    value={editingModel.model_name}
                    onChange={(e) =>
                      setEditingModel({ ...editingModel, model_name: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-provider">Provider</Label>
                  <Input
                    id="edit-provider"
                    value={editingModel.provider}
                    onChange={(e) =>
                      setEditingModel({ ...editingModel, provider: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-content-type">Content Type</Label>
                  <Select
                    value={editingModel.content_type}
                    onValueChange={(value) =>
                      setEditingModel({ ...editingModel, content_type: value })
                    }
                  >
                    <SelectTrigger id="edit-content-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image">Image</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="audio">Audio</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-base-cost">Base Token Cost</Label>
                  <Input
                    id="edit-base-cost"
                    type="number"
                    value={editingModel.base_token_cost}
                    onChange={(e) =>
                      setEditingModel({
                        ...editingModel,
                        base_token_cost: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-api-endpoint">API Endpoint</Label>
                  <Input
                    id="edit-api-endpoint"
                    value={editingModel.api_endpoint || ""}
                    onChange={(e) =>
                      setEditingModel({ ...editingModel, api_endpoint: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-payload-structure">Payload Structure</Label>
                  <Select
                    value={editingModel.payload_structure}
                    onValueChange={(value) =>
                      setEditingModel({ ...editingModel, payload_structure: value })
                    }
                  >
                    <SelectTrigger id="edit-payload-structure">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat">Flat</SelectItem>
                      <SelectItem value="wrapper">Wrapper</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-max-images">Max Images</Label>
                  <Input
                    id="edit-max-images"
                    type="number"
                    value={editingModel.max_images || ""}
                    onChange={(e) =>
                      setEditingModel({
                        ...editingModel,
                        max_images: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-estimated-time">Estimated Time (seconds)</Label>
                  <Input
                    id="edit-estimated-time"
                    type="number"
                    value={editingModel.estimated_time_seconds || ""}
                    onChange={(e) =>
                      setEditingModel({
                        ...editingModel,
                        estimated_time_seconds: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-default-outputs">Default Outputs</Label>
                  <Input
                    id="edit-default-outputs"
                    type="number"
                    value={editingModel.default_outputs || ""}
                    onChange={(e) =>
                      setEditingModel({
                        ...editingModel,
                        default_outputs: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-model-family">Model Family</Label>
                  <Input
                    id="edit-model-family"
                    value={editingModel.model_family || ""}
                    onChange={(e) =>
                      setEditingModel({ ...editingModel, model_family: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-variant-name">Variant Name</Label>
                  <Input
                    id="edit-variant-name"
                    value={editingModel.variant_name || ""}
                    onChange={(e) =>
                      setEditingModel({ ...editingModel, variant_name: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-display-order">Display Order</Label>
                  <Input
                    id="edit-display-order"
                    type="number"
                    value={editingModel.display_order_in_family || ""}
                    onChange={(e) =>
                      setEditingModel({
                        ...editingModel,
                        display_order_in_family: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-logo-url">Logo URL</Label>
                <Input
                  id="edit-logo-url"
                  value={editingModel.logo_url || ""}
                  onChange={(e) =>
                    setEditingModel({ ...editingModel, logo_url: e.target.value })
                  }
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-is-active"
                  checked={editingModel.is_active}
                  onCheckedChange={(checked) =>
                    setEditingModel({ ...editingModel, is_active: checked })
                  }
                />
                <Label htmlFor="edit-is-active">Active</Label>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={updateModel.isPending}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
