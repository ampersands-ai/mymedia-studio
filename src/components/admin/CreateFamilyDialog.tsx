import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Search, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAllModels } from "@/lib/models/registry";
import { formatContentType } from "@/lib/utils/provider-display";
import { useCreateModelPage } from "@/hooks/useAdminModelPages";

const categories = [
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
  { value: "audio", label: "Audio" },
  { value: "avatar", label: "Avatar" },
  { value: "lip-sync", label: "Lip Sync" },
];

const formSchema = z.object({
  family_name: z.string().min(2, "Family name must be at least 2 characters"),
  slug: z.string()
    .min(2, "Slug must be at least 2 characters")
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  category: z.string().min(1, "Category is required"),
  provider: z.string().min(1, "Provider is required"),
  model_record_ids: z.array(z.string()).min(1, "Select at least one model"),
});

type FormData = z.infer<typeof formSchema>;

interface CreateFamilyDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function CreateFamilyDialog({ open, onOpenChange, trigger }: CreateFamilyDialogProps) {
  const [modelSearchQuery, setModelSearchQuery] = useState("");
  const [internalOpen, setInternalOpen] = useState(false);
  
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;
  
  const createMutation = useCreateModelPage();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      family_name: "",
      slug: "",
      category: "",
      provider: "",
      model_record_ids: [],
    },
  });

  const selectedModels = form.watch("model_record_ids");

  // Get all models from registry
  const allModels = useMemo(() => {
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

  // Get unique providers from models
  const providers = useMemo(() => {
    const uniqueProviders = [...new Set(allModels.map(m => m.provider))];
    return uniqueProviders.sort();
  }, [allModels]);

  // Filter models based on search query
  const filteredModels = useMemo(() => {
    if (!modelSearchQuery) return allModels.slice(0, 30);
    const query = modelSearchQuery.toLowerCase();
    return allModels.filter(m => 
      m.modelName.toLowerCase().includes(query) ||
      m.contentType.toLowerCase().includes(query) ||
      m.provider.toLowerCase().includes(query)
    ).slice(0, 50);
  }, [allModels, modelSearchQuery]);

  // Auto-generate slug from family name
  const handleFamilyNameChange = (value: string) => {
    form.setValue("family_name", value);
    // Only auto-update slug if it hasn't been manually modified
    const currentSlug = form.getValues("slug");
    const autoSlug = value.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
    
    if (!currentSlug || currentSlug === form.getValues("family_name").toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-")) {
      form.setValue("slug", autoSlug);
    }
  };

  const handleModelToggle = (recordId: string) => {
    const current = form.getValues("model_record_ids");
    const isSelected = current.includes(recordId);
    
    if (isSelected) {
      form.setValue("model_record_ids", current.filter(id => id !== recordId));
    } else {
      form.setValue("model_record_ids", [...current, recordId]);
      
      // Auto-populate provider if not set
      const model = allModels.find(m => m.recordId === recordId);
      if (model && !form.getValues("provider")) {
        form.setValue("provider", model.provider);
      }
      
      // Auto-populate category based on content type if not set
      if (model && !form.getValues("category")) {
        const contentType = model.contentType.toLowerCase();
        if (contentType.includes("image")) {
          form.setValue("category", "image");
        } else if (contentType.includes("video")) {
          form.setValue("category", "video");
        } else if (contentType.includes("audio")) {
          form.setValue("category", "audio");
        } else if (contentType.includes("lip")) {
          form.setValue("category", "lip-sync");
        }
      }
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      // Get the first model as primary record ID
      const primaryRecordId = data.model_record_ids[0];
      
      await createMutation.mutateAsync({
        model_name: data.family_name,
        slug: data.slug,
        category: data.category,
        provider: data.provider,
        model_record_id: primaryRecordId,
        model_record_ids: data.model_record_ids,
        meta_title: `${data.family_name} - AI Generation | ARTIFIO`,
        meta_description: `Create amazing content with ${data.family_name}. Generate high-quality ${data.category} content using cutting-edge AI technology.`,
      });
      
      form.reset();
      setModelSearchQuery("");
      setIsOpen(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen);
    if (!newOpen) {
      form.reset();
      setModelSearchQuery("");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Create Model Family
          </DialogTitle>
          <DialogDescription>
            Create a new landing page for a family of related models (e.g., FLUX 2, Sora 2).
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-hidden flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Family Name */}
              <FormField
                control={form.control}
                name="family_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Family Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., FLUX 2, Sora 2" 
                        {...field}
                        onChange={(e) => handleFamilyNameChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Slug */}
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL Slug</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., flux-2" {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">
                      /models/{field.value || "slug"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Provider */}
              <FormField
                control={form.control}
                name="provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {providers.map((provider) => (
                          <SelectItem key={provider} value={provider}>
                            {provider}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Model Selection */}
            <FormField
              control={form.control}
              name="model_record_ids"
              render={() => (
                <FormItem className="flex-1 overflow-hidden flex flex-col">
                  <FormLabel>Select Models ({selectedModels.length} selected)</FormLabel>
                  <FormDescription>
                    Choose models to include in this family page
                  </FormDescription>
                  
                  {/* Selected Models Pills */}
                  {selectedModels.length > 0 && (
                    <div className="flex flex-wrap gap-1 py-2">
                      {selectedModels.map(recordId => {
                        const model = allModels.find(m => m.recordId === recordId);
                        return model ? (
                          <Badge 
                            key={recordId} 
                            variant="secondary"
                            className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => handleModelToggle(recordId)}
                          >
                            {model.modelName}
                            <span className="ml-1">×</span>
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search models by name, type, or provider..."
                      value={modelSearchQuery}
                      onChange={(e) => setModelSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  {/* Model List */}
                  <ScrollArea className="flex-1 border rounded-md min-h-[200px] max-h-[250px]">
                    <div className="p-2 space-y-1">
                      {filteredModels.map((model) => {
                        const isSelected = selectedModels.includes(model.recordId);
                        return (
                          <div
                            key={model.recordId}
                            className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                              isSelected 
                                ? "bg-primary/10 border border-primary/30" 
                                : "hover:bg-muted"
                            }`}
                            onClick={() => handleModelToggle(model.recordId)}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleModelToggle(model.recordId)}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{model.modelName}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {model.provider} • {formatContentType(model.contentType)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      {filteredModels.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No models found
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || selectedModels.length === 0}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Family
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
