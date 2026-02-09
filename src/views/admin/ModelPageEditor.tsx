import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Eye, Plus, Trash2, GripVertical, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { SmartLoader } from "@/components/ui/smart-loader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAdminModelPage,
  useCreateModelPage,
  useUpdateModelPage,
  useAdminModelSamples,
  useCreateModelSample,
  useDeleteModelSample,
  useAdminPromptTemplates,
  useCreatePromptTemplate,
  useDeletePromptTemplate,
  type ModelPageInput,
} from "@/hooks/useAdminModelPages";
import type { HighlightItem, UseCaseItem, FAQItem } from "@/hooks/useModelPages";
import { brand } from "@/config/brand";

const categories = [
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
  { value: "audio", label: "Audio" },
  { value: "avatar", label: "Avatar" },
  { value: "lip-sync", label: "Lip Sync" },
];

export default function ModelPageEditor() {
  const { id } = useParams<{ id: string }>() ?? {};
  const router = useRouter();
  const isNew = id === "new";

  const { data: existingPage, isLoading } = useAdminModelPage(id || "");
  const { data: samples } = useAdminModelSamples(isNew ? undefined : id);
  const { data: promptTemplates } = useAdminPromptTemplates(isNew ? undefined : id);
  
  const createMutation = useCreateModelPage();
  const updateMutation = useUpdateModelPage();
  const createSampleMutation = useCreateModelSample();
  const deleteSampleMutation = useDeleteModelSample();
  const createTemplateMutation = useCreatePromptTemplate();
  const deleteTemplateMutation = useDeletePromptTemplate();

  // Form state
  const [formData, setFormData] = useState<ModelPageInput>({
    slug: "",
    model_name: "",
    model_record_id: "",
    provider: "",
    category: "image",
    tagline: "",
    description: "",
    meta_title: "",
    meta_description: "",
    keywords: [],
    hero_image_url: "",
    hero_video_url: "",
    og_image_url: "",
    highlights: [],
    specifications: {},
    use_cases: [],
    faqs: [],
    pricing_note: "",
    is_published: false,
    is_featured: false,
    display_order: 0,
  });

  const [keywordsInput, setKeywordsInput] = useState("");
  const [newHighlight, setNewHighlight] = useState<HighlightItem>({ icon: "", title: "", description: "" });
  const [newUseCase, setNewUseCase] = useState<UseCaseItem>({ title: "", description: "", icon: "" });
  const [newFAQ, setNewFAQ] = useState<FAQItem>({ question: "", answer: "" });
  const [newSpec, setNewSpec] = useState({ key: "", value: "" });

  // Sample form
  const [newSample, setNewSample] = useState({
    prompt: "",
    output_url: "",
    output_type: "image",
    title: "",
    input_url: "",
    input_type: "image",
  });

  // Template form
  const [newTemplate, setNewTemplate] = useState({
    title: "",
    prompt_template: "",
    description: "",
    category: "",
  });

  // Load existing data
  useEffect(() => {
    if (existingPage) {
      setFormData({
        slug: existingPage.slug,
        model_name: existingPage.model_name,
        model_record_id: existingPage.model_record_id,
        provider: existingPage.provider,
        category: existingPage.category,
        tagline: existingPage.tagline || "",
        description: existingPage.description || "",
        meta_title: existingPage.meta_title,
        meta_description: existingPage.meta_description,
        keywords: existingPage.keywords || [],
        hero_image_url: existingPage.hero_image_url || "",
        hero_video_url: existingPage.hero_video_url || "",
        og_image_url: existingPage.og_image_url || "",
        highlights: existingPage.highlights || [],
        specifications: (existingPage.specifications as Record<string, string | number>) || {},
        use_cases: existingPage.use_cases || [],
        faqs: existingPage.faqs || [],
        pricing_note: existingPage.pricing_note || "",
        is_published: existingPage.is_published || false,
        is_featured: existingPage.is_featured || false,
        display_order: existingPage.display_order || 0,
      });
      setKeywordsInput((existingPage.keywords || []).join(", "));
    }
  }, [existingPage]);

  const handleSave = async () => {
    const dataToSave = {
      ...formData,
      keywords: keywordsInput.split(",").map(k => k.trim()).filter(Boolean),
    };

    if (isNew) {
      await createMutation.mutateAsync(dataToSave);
      router.push("/admin/model-pages");
    } else if (id) {
      await updateMutation.mutateAsync({ id, ...dataToSave });
    }
  };

  const addHighlight = () => {
    if (newHighlight.title && newHighlight.description) {
      setFormData(prev => ({
        ...prev,
        highlights: [...(prev.highlights || []), newHighlight],
      }));
      setNewHighlight({ icon: "", title: "", description: "" });
    }
  };

  const removeHighlight = (index: number) => {
    setFormData(prev => ({
      ...prev,
      highlights: prev.highlights?.filter((_, i) => i !== index),
    }));
  };

  const addUseCase = () => {
    if (newUseCase.title && newUseCase.description) {
      setFormData(prev => ({
        ...prev,
        use_cases: [...(prev.use_cases || []), newUseCase],
      }));
      setNewUseCase({ title: "", description: "", icon: "" });
    }
  };

  const removeUseCase = (index: number) => {
    setFormData(prev => ({
      ...prev,
      use_cases: prev.use_cases?.filter((_, i) => i !== index),
    }));
  };

  const addFAQ = () => {
    if (newFAQ.question && newFAQ.answer) {
      setFormData(prev => ({
        ...prev,
        faqs: [...(prev.faqs || []), newFAQ],
      }));
      setNewFAQ({ question: "", answer: "" });
    }
  };

  const removeFAQ = (index: number) => {
    setFormData(prev => ({
      ...prev,
      faqs: prev.faqs?.filter((_, i) => i !== index),
    }));
  };

  const addSpec = () => {
    if (newSpec.key && newSpec.value) {
      setFormData(prev => ({
        ...prev,
        specifications: { ...prev.specifications, [newSpec.key]: newSpec.value },
      }));
      setNewSpec({ key: "", value: "" });
    }
  };

  const removeSpec = (key: string) => {
    setFormData(prev => {
      const newSpecs = { ...prev.specifications };
      delete newSpecs[key];
      return { ...prev, specifications: newSpecs };
    });
  };

  const handleAddSample = async () => {
    if (!id || isNew || !newSample.prompt || !newSample.output_url) return;
    await createSampleMutation.mutateAsync({
      model_page_id: id,
      title: newSample.title || undefined,
      prompt: newSample.prompt,
      output_url: newSample.output_url,
      output_type: newSample.output_type,
      input_url: newSample.input_url || undefined,
      input_type: newSample.input_url ? newSample.input_type : undefined,
    });
    setNewSample({ prompt: "", output_url: "", output_type: "image", title: "", input_url: "", input_type: "image" });
  };

  const handleDeleteSample = async (sampleId: string) => {
    if (!id) return;
    await deleteSampleMutation.mutateAsync({ id: sampleId, modelPageId: id });
  };

  const handleAddTemplate = async () => {
    if (!id || isNew || !newTemplate.title || !newTemplate.prompt_template) return;
    await createTemplateMutation.mutateAsync({
      model_page_id: id,
      ...newTemplate,
    });
    setNewTemplate({ title: "", prompt_template: "", description: "", category: "" });
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!id) return;
    await deleteTemplateMutation.mutateAsync({ id: templateId, modelPageId: id });
  };

  if (isLoading && !isNew) {
    return <SmartLoader message="Loading model page..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/admin/model-pages")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-black">
              {isNew ? "Create Model Page" : "Edit Model Page"}
            </h1>
            <p className="text-muted-foreground">
              {isNew ? "Create a new SEO landing page for an AI model" : formData.model_name}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isNew && formData.is_published && (
            <Button variant="outline" onClick={() => window.open(`/models/${formData.slug}`, "_blank")}>
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
          )}
          <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
        </div>
      </div>

      <Tabs defaultValue="basic" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="samples" disabled={isNew}>Samples</TabsTrigger>
          <TabsTrigger value="templates" disabled={isNew}>Templates</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
        </TabsList>

        {/* Basic Info Tab */}
        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Model Information</CardTitle>
              <CardDescription>Basic details about the AI model</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="model_name">Model Name *</Label>
                  <Input
                    id="model_name"
                    value={formData.model_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, model_name: e.target.value }))}
                    placeholder="e.g., FLUX.1 Pro"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">URL Slug *</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    placeholder="e.g., flux-1-pro"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="provider">Provider *</Label>
                  <Input
                    id="provider"
                    value={formData.provider}
                    onChange={(e) => setFormData(prev => ({ ...prev, provider: e.target.value }))}
                    placeholder="e.g., Black Forest Labs"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model_record_id">Model Record ID *</Label>
                  <Input
                    id="model_record_id"
                    value={formData.model_record_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, model_record_id: e.target.value }))}
                    placeholder="UUID from ai_models table"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="display_order">Display Order</Label>
                  <Input
                    id="display_order"
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  id="tagline"
                  value={formData.tagline}
                  onChange={(e) => setFormData(prev => ({ ...prev, tagline: e.target.value }))}
                  placeholder="e.g., State-of-the-art image generation"
                />
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    id="is_published"
                    checked={formData.is_published}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_published: checked }))}
                  />
                  <Label htmlFor="is_published">Published</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="is_featured"
                    checked={formData.is_featured}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_featured: checked }))}
                  />
                  <Label htmlFor="is_featured">Featured</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Media</CardTitle>
              <CardDescription>Hero images and videos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hero_image_url">Hero Image URL</Label>
                <Input
                  id="hero_image_url"
                  value={formData.hero_image_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, hero_image_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hero_video_url">Hero Video URL</Label>
                <Input
                  id="hero_video_url"
                  value={formData.hero_video_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, hero_video_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Detailed description of the model..."
                rows={6}
              />
            </CardContent>
          </Card>

          {/* Highlights */}
          <Card>
            <CardHeader>
              <CardTitle>Highlights</CardTitle>
              <CardDescription>Key features of the model</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.highlights?.map((h, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-muted rounded">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="outline">{h.icon}</Badge>
                  <span className="font-medium">{h.title}</span>
                  <span className="text-muted-foreground text-sm flex-1">{h.description}</span>
                  <Button variant="ghost" size="icon" onClick={() => removeHighlight(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="grid gap-2 md:grid-cols-4">
                <Input
                  placeholder="Icon (emoji)"
                  value={newHighlight.icon}
                  onChange={(e) => setNewHighlight(prev => ({ ...prev, icon: e.target.value }))}
                />
                <Input
                  placeholder="Title"
                  value={newHighlight.title}
                  onChange={(e) => setNewHighlight(prev => ({ ...prev, title: e.target.value }))}
                />
                <Input
                  placeholder="Description"
                  value={newHighlight.description}
                  onChange={(e) => setNewHighlight(prev => ({ ...prev, description: e.target.value }))}
                  className="md:col-span-1"
                />
                <Button onClick={addHighlight} variant="outline">
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Specifications */}
          <Card>
            <CardHeader>
              <CardTitle>Specifications</CardTitle>
              <CardDescription>Technical specifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(formData.specifications || {}).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2 p-2 bg-muted rounded">
                  <span className="font-medium">{key}:</span>
                  <span className="text-muted-foreground flex-1">{value}</span>
                  <Button variant="ghost" size="icon" onClick={() => removeSpec(key)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="grid gap-2 md:grid-cols-3">
                <Input
                  placeholder="Key (e.g., Resolution)"
                  value={newSpec.key}
                  onChange={(e) => setNewSpec(prev => ({ ...prev, key: e.target.value }))}
                />
                <Input
                  placeholder="Value (e.g., Up to 4K)"
                  value={newSpec.value}
                  onChange={(e) => setNewSpec(prev => ({ ...prev, value: e.target.value }))}
                />
                <Button onClick={addSpec} variant="outline">
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Use Cases */}
          <Card>
            <CardHeader>
              <CardTitle>Use Cases</CardTitle>
              <CardDescription>Ideal use cases for the model</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.use_cases?.map((uc, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-muted rounded">
                  <Badge variant="outline">{uc.icon}</Badge>
                  <span className="font-medium">{uc.title}</span>
                  <span className="text-muted-foreground text-sm flex-1">{uc.description}</span>
                  <Button variant="ghost" size="icon" onClick={() => removeUseCase(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="grid gap-2 md:grid-cols-4">
                <Input
                  placeholder="Icon (emoji)"
                  value={newUseCase.icon}
                  onChange={(e) => setNewUseCase(prev => ({ ...prev, icon: e.target.value }))}
                />
                <Input
                  placeholder="Title"
                  value={newUseCase.title}
                  onChange={(e) => setNewUseCase(prev => ({ ...prev, title: e.target.value }))}
                />
                <Input
                  placeholder="Description"
                  value={newUseCase.description}
                  onChange={(e) => setNewUseCase(prev => ({ ...prev, description: e.target.value }))}
                />
                <Button onClick={addUseCase} variant="outline">
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* FAQs */}
          <Card>
            <CardHeader>
              <CardTitle>FAQs</CardTitle>
              <CardDescription>Frequently asked questions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.faqs?.map((faq, i) => (
                <div key={i} className="p-3 bg-muted rounded space-y-1">
                  <div className="flex items-start justify-between">
                    <p className="font-medium">{faq.question}</p>
                    <Button variant="ghost" size="icon" onClick={() => removeFAQ(i)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">{faq.answer}</p>
                </div>
              ))}
              <div className="space-y-2">
                <Input
                  placeholder="Question"
                  value={newFAQ.question}
                  onChange={(e) => setNewFAQ(prev => ({ ...prev, question: e.target.value }))}
                />
                <Textarea
                  placeholder="Answer"
                  value={newFAQ.answer}
                  onChange={(e) => setNewFAQ(prev => ({ ...prev, answer: e.target.value }))}
                  rows={2}
                />
                <Button onClick={addFAQ} variant="outline">
                  <Plus className="h-4 w-4 mr-1" /> Add FAQ
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing Note</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                value={formData.pricing_note}
                onChange={(e) => setFormData(prev => ({ ...prev, pricing_note: e.target.value }))}
                placeholder="e.g., Starting at $0.05 per image"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Samples Tab */}
        <TabsContent value="samples" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Model Samples</CardTitle>
              <CardDescription>Showcase examples generated by this model</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {samples?.map((sample) => (
                <div key={sample.id} className="flex items-center gap-4 p-3 bg-muted rounded">
                  {/* Show input media if exists */}
                  {sample.input_url && (
                    <>
                      <div className="relative">
                        {sample.input_type === "video" ? (
                          <video
                            src={sample.input_url}
                            className="w-16 h-16 object-cover rounded"
                            muted
                          />
                        ) : (
                          <img
                            src={sample.input_url}
                            alt="Input"
                            className="w-16 h-16 object-cover rounded"
                          />
                        )}
                        <Badge className="absolute -top-1 -left-1 text-[10px] px-1 py-0">IN</Badge>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </>
                  )}
                  {/* Output media */}
                  {sample.thumbnail_url || sample.output_url ? (
                    <div className="relative">
                      {sample.output_type === "video" ? (
                        <video
                          src={sample.output_url}
                          className="w-16 h-16 object-cover rounded"
                          muted
                        />
                      ) : (
                        <img
                          src={sample.thumbnail_url || sample.output_url}
                          alt={sample.title || "Sample"}
                          className="w-16 h-16 object-cover rounded"
                        />
                      )}
                      {sample.input_url && (
                        <Badge className="absolute -top-1 -left-1 text-[10px] px-1 py-0">OUT</Badge>
                      )}
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-muted-foreground/20 rounded flex items-center justify-center">
                      {sample.output_type}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{sample.title || "Untitled"}</p>
                    <p className="text-sm text-muted-foreground line-clamp-1">{sample.prompt}</p>
                  </div>
                  <Badge variant="outline">{sample.output_type}</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteSample(sample.id)}
                    disabled={deleteSampleMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <div className="border-t pt-4 space-y-4">
                <h4 className="font-medium">Add New Sample</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    placeholder="Title (optional)"
                    value={newSample.title}
                    onChange={(e) => setNewSample(prev => ({ ...prev, title: e.target.value }))}
                  />
                  <Select
                    value={newSample.output_type}
                    onValueChange={(value) => setNewSample(prev => ({ ...prev, output_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image">Image</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="audio">Audio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Input Media Section */}
                <div className="space-y-2 border-l-2 border-primary/50 pl-4">
                  <Label className="text-sm font-medium text-primary">Input Media (for before/after comparison)</Label>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input
                      placeholder="Input URL (image or video used as input)"
                      value={newSample.input_url}
                      onChange={(e) => setNewSample(prev => ({ ...prev, input_url: e.target.value }))}
                    />
                    <Select
                      value={newSample.input_type}
                      onValueChange={(value) => setNewSample(prev => ({ ...prev, input_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Input Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="image">Image</SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Input
                  placeholder="Output URL *"
                  value={newSample.output_url}
                  onChange={(e) => setNewSample(prev => ({ ...prev, output_url: e.target.value }))}
                />
                <Textarea
                  placeholder="Prompt *"
                  value={newSample.prompt}
                  onChange={(e) => setNewSample(prev => ({ ...prev, prompt: e.target.value }))}
                  rows={3}
                />
                <Button
                  onClick={handleAddSample}
                  disabled={createSampleMutation.isPending || !newSample.prompt || !newSample.output_url}
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Sample
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Prompt Templates</CardTitle>
              <CardDescription>Copyable prompt templates for users</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {promptTemplates?.map((template) => (
                <div key={template.id} className="p-3 bg-muted rounded space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{template.title}</p>
                      {template.category && (
                        <Badge variant="outline" className="mt-1">{template.category}</Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteTemplate(template.id)}
                      disabled={deleteTemplateMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {template.description && (
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                  )}
                  <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
                    {template.prompt_template}
                  </pre>
                </div>
              ))}

              <div className="border-t pt-4 space-y-4">
                <h4 className="font-medium">Add New Template</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    placeholder="Title *"
                    value={newTemplate.title}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, title: e.target.value }))}
                  />
                  <Input
                    placeholder="Category (optional)"
                    value={newTemplate.category}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, category: e.target.value }))}
                  />
                </div>
                <Input
                  placeholder="Description (optional)"
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                />
                <Textarea
                  placeholder="Prompt template *"
                  value={newTemplate.prompt_template}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, prompt_template: e.target.value }))}
                  rows={4}
                />
                <Button
                  onClick={handleAddTemplate}
                  disabled={createTemplateMutation.isPending || !newTemplate.title || !newTemplate.prompt_template}
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Template
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SEO Tab */}
        <TabsContent value="seo" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>SEO Settings</CardTitle>
              <CardDescription>Optimize for search engines</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="meta_title">Meta Title *</Label>
                <Input
                  id="meta_title"
                  value={formData.meta_title}
                  onChange={(e) => setFormData(prev => ({ ...prev, meta_title: e.target.value }))}
                  placeholder={`e.g., FLUX.1 Pro - AI Image Generator | ${brand.name}`}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.meta_title.length}/60 characters
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="meta_description">Meta Description *</Label>
                <Textarea
                  id="meta_description"
                  value={formData.meta_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, meta_description: e.target.value }))}
                  placeholder="Compelling description for search results..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.meta_description.length}/160 characters
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="keywords">Keywords</Label>
                <Input
                  id="keywords"
                  value={keywordsInput}
                  onChange={(e) => setKeywordsInput(e.target.value)}
                  placeholder="AI image generator, FLUX, text to image (comma separated)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="og_image_url">OG Image URL</Label>
                <Input
                  id="og_image_url"
                  value={formData.og_image_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, og_image_url: e.target.value }))}
                  placeholder="https://... (1200x630 recommended)"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
