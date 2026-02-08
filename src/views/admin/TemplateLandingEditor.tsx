import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { useAdminTemplates } from "@/hooks/useAdminTemplates";
import { useTemplateCategories } from "@/hooks/useTemplateLanding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SmartLoader } from "@/components/ui/smart-loader";
import { ImageUploader } from "@/components/admin/template-landing/ImageUploader";
import { ArrowLeft, Save, Eye } from "lucide-react";
import type { TemplateLandingPageAdmin, TemplateCategory } from "@/hooks/useTemplateLanding";

export default function TemplateLandingEditor() {
  const { id } = useParams<{ id: string }>() ?? {};
  const router = useRouter();
  const isNew = id === "new";
  const { createTemplate, updateTemplate } = useAdminTemplates();
  const { data: categories } = useTemplateCategories();

  const { data: template, isLoading } = useQuery({
    queryKey: ["template-landing", id],
    queryFn: async () => {
      if (isNew) return null;
      const { data, error } = await supabase
        .from("template_landing_pages")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as TemplateLandingPageAdmin;
    },
    enabled: !isNew,
  });

  const { register, handleSubmit, watch, setValue, reset } = useForm<Partial<TemplateLandingPageAdmin>>({
    defaultValues: {
      is_published: false,
      token_cost: 100,
    },
  });

  useEffect(() => {
    if (template) {
      reset(template);
    }
  }, [template, reset]);

  const title = watch("title");
  useEffect(() => {
    if (title && isNew) {
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      setValue("slug", slug);
    }
  }, [title, isNew, setValue]);

  const onSubmit = async (data: Partial<TemplateLandingPageAdmin>) => {
    if (isNew) {
      const result = await createTemplate.mutateAsync(data);
      router.push(`/admin/template-landing/${result.id}`);
    } else {
      await updateTemplate.mutateAsync({ id: id!, updates: data });
    }
  };

  const handlePreview = () => {
    const slug = watch("slug");
    const category = watch("category_slug");
    if (slug && category) {
      window.open(`/templates/${category}/${slug}`, "_blank");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <SmartLoader />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/admin/template-landing")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {isNew ? "Create Template Page" : "Edit Template Page"}
            </h1>
            <p className="text-muted-foreground">
              {isNew ? "Create a new SEO-optimized landing page" : `Editing: ${template?.title}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePreview} disabled={isNew && !watch("slug")}>
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button onClick={handleSubmit(onSubmit)}>
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList>
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
            <Card className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input id="title" {...register("title", { required: true })} placeholder="YouTube Thumbnail Creator" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category_slug">Category *</Label>
                  <Select
                    value={watch("category_slug")}
                    onValueChange={(value) => setValue("category_slug", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((cat: TemplateCategory) => (
                        <SelectItem key={cat.id} value={cat.slug}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">Slug *</Label>
                  <Input id="slug" {...register("slug", { required: true })} placeholder="youtube-thumbnail-creator" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subtitle">Subtitle</Label>
                <Textarea id="subtitle" {...register("subtitle")} placeholder="Short description (1-2 sentences)" rows={2} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="long_description">Long Description</Label>
                <Textarea id="long_description" {...register("long_description")} placeholder="Full description (800-1200 words)" rows={8} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="token_cost">Credit Cost</Label>
                <Input id="token_cost" type="number" {...register("token_cost", { valueAsNumber: true })} />
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-6">
            <Card className="p-6 space-y-4">
              <ImageUploader
                label="Hero Before Image"
                value={watch("hero_before_image") || ""}
                onChange={(url) => setValue("hero_before_image", url)}
              />

              <ImageUploader
                label="Hero After Image"
                value={watch("hero_after_image") || ""}
                onChange={(url) => setValue("hero_after_image", url)}
              />

              <ImageUploader
                label="Thumbnail"
                value={watch("thumbnail_url") || ""}
                onChange={(url) => setValue("thumbnail_url", url)}
              />

              <div className="space-y-2">
                <Label htmlFor="demo_video_url">Demo Video URL</Label>
                <Input id="demo_video_url" {...register("demo_video_url")} placeholder="https://youtube.com/..." />
              </div>

              <div className="space-y-2">
                <Label>Example Images (JSON)</Label>
                <Textarea
                  placeholder='[{"url": "https://...", "caption": "Example 1", "settings": "Style: Modern"}]'
                  {...register("example_images")}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Format: Array of {`{url, caption, settings}`}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Steps (JSON)</Label>
                <Textarea
                  placeholder='[{"title": "Step 1", "description": "...", "icon": "Sparkles"}]'
                  {...register("steps")}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Use Cases (JSON)</Label>
                <Textarea
                  placeholder='[{"title": "For YouTubers", "description": "Create eye-catching thumbnails"}]'
                  {...register("use_cases")}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>FAQs (JSON)</Label>
                <Textarea
                  placeholder='[{"question": "How does it work?", "answer": "..."}]'
                  {...register("faqs")}
                  rows={4}
                />
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="seo" className="space-y-6">
            <Card className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="meta_title">Meta Title *</Label>
                <Input id="meta_title" {...register("meta_title", { required: true })} maxLength={60} />
                <p className="text-xs text-muted-foreground">
                  {watch("meta_title")?.length || 0}/60 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="meta_description">Meta Description *</Label>
                <Textarea id="meta_description" {...register("meta_description", { required: true })} maxLength={160} rows={3} />
                <p className="text-xs text-muted-foreground">
                  {watch("meta_description")?.length || 0}/160 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label>Keywords (JSON Array)</Label>
                <Textarea
                  placeholder='["youtube thumbnail", "thumbnail maker", "ai thumbnail generator"]'
                  {...register("keywords")}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Target Audience (JSON Array)</Label>
                <Textarea
                  placeholder='["YouTubers", "Content Creators", "Marketers"]'
                  {...register("target_audience")}
                  rows={2}
                />
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Published</Label>
                  <p className="text-sm text-muted-foreground">
                    Make this template page visible to the public
                  </p>
                </div>
                <Switch
                  checked={watch("is_published")}
                  onCheckedChange={(checked) => setValue("is_published", checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="workflow_id">Workflow ID (Optional)</Label>
                <Input id="workflow_id" {...register("workflow_id")} placeholder="UUID of workflow template" />
              </div>

              <div className="space-y-2">
                <Label>Related Template IDs (JSON Array)</Label>
                <Textarea
                  placeholder='["uuid-1", "uuid-2", "uuid-3"]'
                  {...register("related_template_ids")}
                  rows={2}
                />
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </form>
    </div>
  );
}
