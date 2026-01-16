import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Pencil, Trash2, Globe, GlobeLock, Wand2, ExternalLink, Check, X, Users, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SmartLoader } from "@/components/ui/smart-loader";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CreateFamilyDialog } from "@/components/admin/CreateFamilyDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  useAdminModelPages,
  useDeleteModelPage,
  useToggleModelPagePublish,
  useAutoGenerateModelPages,
  useUpdateDisplayProvider,
  useUpdateHiddenContentTypes,
  useUpdateModelRecordIds,
} from "@/hooks/useAdminModelPages";
import { getAllModels } from "@/lib/models/registry";
import { formatContentType } from "@/lib/utils/provider-display";
import type { ContentTypeGroup } from "@/hooks/useModelPages";

const categories = [
  { value: "all", label: "All Categories" },
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
  { value: "audio", label: "Audio" },
  { value: "avatar", label: "Avatar" },
  { value: "lip-sync", label: "Lip Sync" },
];

// Base provider options - will be merged with dynamic ones from database
const baseProviderOptions = [
  { value: "__auto__", label: "Auto (from provider)" },
  { value: "ARTIFIO", label: "ARTIFIO" },
  { value: "OpenAI", label: "OpenAI" },
  { value: "Google", label: "Google" },
  { value: "Stability AI", label: "Stability AI" },
  { value: "Black Forest Labs", label: "Black Forest Labs" },
  { value: "Runway", label: "Runway" },
];

export default function ModelPagesManager() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [customProviderInputs, setCustomProviderInputs] = useState<Record<string, string>>({});
  const [familySearchQuery, setFamilySearchQuery] = useState<Record<string, string>>({});

  const { data: modelPages, isLoading } = useAdminModelPages();
  const deleteMutation = useDeleteModelPage();
  const togglePublishMutation = useToggleModelPagePublish();
  const autoGenerateMutation = useAutoGenerateModelPages();
  const updateDisplayProviderMutation = useUpdateDisplayProvider();
  const updateHiddenContentTypesMutation = useUpdateHiddenContentTypes();
  const updateModelRecordIdsMutation = useUpdateModelRecordIds();

  // Get all available models from registry for family selection
  const allRegistryModels = useMemo(() => {
    try {
      return getAllModels().map(m => ({
        recordId: m.MODEL_CONFIG.recordId,
        modelName: m.MODEL_CONFIG.modelName,
        contentType: m.MODEL_CONFIG.contentType,
        provider: m.MODEL_CONFIG.provider,
      }));
    } catch {
      return [];
    }
  }, []);

  // Filter models for family popover search
  const getFilteredModelsForFamily = (pageId: string) => {
    const query = (familySearchQuery[pageId] || "").toLowerCase();
    if (!query) return allRegistryModels.slice(0, 20); // Show first 20 by default
    return allRegistryModels.filter(m => 
      m.modelName.toLowerCase().includes(query) ||
      m.contentType.toLowerCase().includes(query)
    ).slice(0, 30);
  };

  // Build dynamic provider options from existing model pages + base options
  const providerOptions = useMemo(() => {
    const baseValues = new Set(baseProviderOptions.map(o => o.value));
    const dynamicProviders: { value: string; label: string }[] = [];
    
    if (modelPages) {
      // Get unique display_provider and provider values from existing pages
      const existingProviders = new Set<string>();
      modelPages.forEach(page => {
        if (page.display_provider && !baseValues.has(page.display_provider)) {
          existingProviders.add(page.display_provider);
        }
        if (page.provider && !baseValues.has(page.provider)) {
          existingProviders.add(page.provider);
        }
      });
      
      // Convert to options and sort
      existingProviders.forEach(provider => {
        dynamicProviders.push({ value: provider, label: provider });
      });
      dynamicProviders.sort((a, b) => a.label.localeCompare(b.label));
    }
    
    return [
      ...baseProviderOptions,
      ...dynamicProviders,
      { value: "__custom__", label: "Custom..." },
    ];
  }, [modelPages]);

  const filteredPages = useMemo(() => {
    if (!modelPages) return [];

    return modelPages.filter((page) => {
      const matchesSearch =
        !searchQuery ||
        page.model_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        page.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
        page.slug.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        categoryFilter === "all" || page.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [modelPages, searchQuery, categoryFilter]);

  const handleDelete = async () => {
    if (deleteId) {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const handleTogglePublish = async (id: string, currentStatus: boolean) => {
    await togglePublishMutation.mutateAsync({
      id,
      is_published: !currentStatus,
    });
  };

  const handleAutoGenerate = () => {
    autoGenerateMutation.mutate();
  };

  const handleProviderChange = (pageId: string, value: string) => {
    if (value === "__custom__") {
      setCustomProviderInputs(prev => ({ ...prev, [pageId]: "" }));
    } else if (value === "__auto__") {
      // Auto - clear display_provider
      updateDisplayProviderMutation.mutate({ id: pageId, display_provider: null });
    } else {
      updateDisplayProviderMutation.mutate({ id: pageId, display_provider: value });
    }
  };

  const handleCustomProviderSubmit = (pageId: string) => {
    const customValue = customProviderInputs[pageId];
    if (customValue?.trim()) {
      updateDisplayProviderMutation.mutate({ id: pageId, display_provider: customValue.trim() });
    }
    setCustomProviderInputs(prev => {
      const next = { ...prev };
      delete next[pageId];
      return next;
    });
  };

  const handleToggleContentType = (pageId: string, contentType: string, currentHidden: string[]) => {
    const isCurrentlyHidden = currentHidden.includes(contentType);
    const newHidden = isCurrentlyHidden
      ? currentHidden.filter(t => t !== contentType)
      : [...currentHidden, contentType];
    
    updateHiddenContentTypesMutation.mutate({ id: pageId, hidden_content_types: newHidden });
  };

  const handleToggleFamilyModel = (pageId: string, recordId: string, currentRecordIds: string[]) => {
    const isIncluded = currentRecordIds.includes(recordId);
    const newRecordIds = isIncluded
      ? currentRecordIds.filter(id => id !== recordId)
      : [...currentRecordIds, recordId];
    
    updateModelRecordIdsMutation.mutate({ id: pageId, model_record_ids: newRecordIds });
  };

  if (isLoading) {
    return <SmartLoader message="Loading model pages..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-black">Model Pages</h1>
          <p className="text-muted-foreground">
            Manage SEO-optimized landing pages for AI models
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleAutoGenerate}
            disabled={autoGenerateMutation.isPending}
          >
            <Wand2 className="mr-2 h-4 w-4" />
            Auto-Generate
          </Button>
          <CreateFamilyDialog 
            trigger={
              <Button variant="outline">
                <FolderPlus className="mr-2 h-4 w-4" />
                Create Family
              </Button>
            }
          />
          <Button onClick={() => navigate("/admin/model-pages/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Create Page
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, provider, or slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Category" />
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

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Pages</p>
          <p className="text-2xl font-bold">{modelPages?.length || 0}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Published</p>
          <p className="text-2xl font-bold text-green-600">
            {modelPages?.filter((p) => p.is_published).length || 0}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Drafts</p>
          <p className="text-2xl font-bold text-yellow-600">
            {modelPages?.filter((p) => !p.is_published).length || 0}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Views</p>
          <p className="text-2xl font-bold">
            {modelPages?.reduce((sum, p) => sum + (p.view_count || 0), 0) || 0}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[200px]">Model</TableHead>
              <TableHead className="min-w-[150px]">Display Provider</TableHead>
              <TableHead className="min-w-[120px]">Family Models</TableHead>
              <TableHead className="min-w-[200px]">Content Types</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Views</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <p className="text-muted-foreground">No model pages found</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredPages.map((page) => {
                const contentTypeGroups = (page as unknown as { content_type_groups?: ContentTypeGroup[] }).content_type_groups || [];
                const hiddenContentTypes = (page as unknown as { hidden_content_types?: string[] }).hidden_content_types || [];
                const modelRecordIds = (page as unknown as { model_record_ids?: string[] }).model_record_ids || [];
                const displayProvider = (page as unknown as { display_provider?: string | null }).display_provider;
                const isEditingCustomProvider = customProviderInputs.hasOwnProperty(page.id);
                const filteredFamilyModels = getFilteredModelsForFamily(page.id);

                return (
                  <TableRow key={page.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{page.model_name}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          /models/{page.slug}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {isEditingCustomProvider ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={customProviderInputs[page.id] || ""}
                            onChange={(e) => setCustomProviderInputs(prev => ({ ...prev, [page.id]: e.target.value }))}
                            placeholder="Enter provider name"
                            className="h-8 w-32"
                            autoFocus
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => handleCustomProviderSubmit(page.id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => setCustomProviderInputs(prev => {
                              const next = { ...prev };
                              delete next[page.id];
                              return next;
                            })}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Select
                          value={displayProvider || "__auto__"}
                          onValueChange={(value) => handleProviderChange(page.id, value)}
                        >
                          <SelectTrigger className="h-8 w-36">
                            <SelectValue placeholder={page.provider} />
                          </SelectTrigger>
                          <SelectContent>
                            {providerOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8">
                            <Users className="h-3 w-3 mr-1" />
                            {modelRecordIds.length} model{modelRecordIds.length !== 1 ? 's' : ''}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80" align="start">
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm font-medium mb-2">Family Models</p>
                              <p className="text-xs text-muted-foreground mb-3">
                                Select models to group under this page
                              </p>
                            </div>
                            <Input
                              placeholder="Search models..."
                              value={familySearchQuery[page.id] || ""}
                              onChange={(e) => setFamilySearchQuery(prev => ({ ...prev, [page.id]: e.target.value }))}
                              className="h-8"
                            />
                            <ScrollArea className="h-64">
                              <div className="space-y-1 pr-3">
                                {filteredFamilyModels.map((model) => {
                                  const isIncluded = modelRecordIds.includes(model.recordId);
                                  return (
                                    <div key={model.recordId} className="flex items-center gap-2 py-1">
                                      <Checkbox
                                        id={`${page.id}-family-${model.recordId}`}
                                        checked={isIncluded}
                                        onCheckedChange={() => handleToggleFamilyModel(page.id, model.recordId, modelRecordIds)}
                                      />
                                      <label
                                        htmlFor={`${page.id}-family-${model.recordId}`}
                                        className="text-xs cursor-pointer flex-1 leading-tight"
                                      >
                                        <span className="font-medium block">{model.modelName}</span>
                                        <span className="text-muted-foreground">{formatContentType(model.contentType)}</span>
                                      </label>
                                    </div>
                                  );
                                })}
                                {filteredFamilyModels.length === 0 && (
                                  <p className="text-xs text-muted-foreground py-2">No models found</p>
                                )}
                              </div>
                            </ScrollArea>
                            {modelRecordIds.length > 0 && (
                              <div className="pt-2 border-t">
                                <p className="text-xs text-muted-foreground">
                                  {modelRecordIds.length} model{modelRecordIds.length !== 1 ? 's' : ''} selected
                                </p>
                              </div>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </TableCell>
                    <TableCell>
                      {contentTypeGroups.length > 0 ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8">
                              {contentTypeGroups.length - hiddenContentTypes.length} of {contentTypeGroups.length} visible
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64" align="start">
                            <div className="space-y-2">
                              <p className="text-sm font-medium mb-3">Toggle visibility:</p>
                              {contentTypeGroups.map((group, idx) => {
                                const isHidden = hiddenContentTypes.includes(group.content_type);
                                return (
                                  <div key={idx} className="flex items-center gap-2">
                                    <Checkbox
                                      id={`${page.id}-${group.content_type}`}
                                      checked={!isHidden}
                                      onCheckedChange={() => handleToggleContentType(page.id, group.content_type, hiddenContentTypes)}
                                    />
                                    <label
                                      htmlFor={`${page.id}-${group.content_type}`}
                                      className={`text-sm cursor-pointer ${isHidden ? 'text-muted-foreground line-through' : ''}`}
                                    >
                                      {formatContentType(group.content_type)}
                                    </label>
                                  </div>
                                );
                              })}
                            </div>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {page.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {page.is_published ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                          <Globe className="mr-1 h-3 w-3" />
                          Published
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <GlobeLock className="mr-1 h-3 w-3" />
                          Draft
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {page.view_count || 0}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <span className="sr-only">Actions</span>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <circle cx="12" cy="12" r="1" />
                              <circle cx="12" cy="5" r="1" />
                              <circle cx="12" cy="19" r="1" />
                            </svg>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {page.is_published && (
                            <DropdownMenuItem
                              onClick={() =>
                                window.open(`/models/${page.slug}`, "_blank")
                              }
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              View Page
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() =>
                              navigate(`/admin/model-pages/${page.id}`)
                            }
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleTogglePublish(page.id, page.is_published || false)
                            }
                          >
                            {page.is_published ? (
                              <>
                                <GlobeLock className="mr-2 h-4 w-4" />
                                Unpublish
                              </>
                            ) : (
                              <>
                                <Globe className="mr-2 h-4 w-4" />
                                Publish
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteId(page.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Model Page</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this model page? This action cannot
              be undone and will also delete all associated samples and prompt
              templates.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}