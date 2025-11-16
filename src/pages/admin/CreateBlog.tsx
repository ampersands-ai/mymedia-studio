import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BlogEditor } from "@/components/blog/BlogEditor";
import { SEOFields } from "@/components/blog/SEOFields";
import { BlogImageManager } from "@/components/blog/BlogImageManager";
import { BlogPost, BlogImage, SEOMetadata, GenerateBlogRequest } from "@/types/blog";
import { generateBlogTopics, generateBlogPost } from "@/services/blogAI";
import { sendBlogPostEmail } from "@/services/emailDistribution";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Sparkles, Loader2, Save, Eye, Send, Mail } from "lucide-react";

export default function CreateBlog() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [status, setStatus] = useState<BlogPost['status']>('draft');
  const [seoMetadata, setSeoMetadata] = useState<SEOMetadata>({});
  const [images, setImages] = useState<Partial<BlogImage>[]>([]);
  const [blogPostId, setBlogPostId] = useState<string | null>(null);

  // UI state
  const [isGeneratingTopics, setIsGeneratingTopics] = useState(false);
  const [isGeneratingPost, setIsGeneratingPost] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showTopicsDialog, setShowTopicsDialog] = useState(false);
  const [generatedTopics, setGeneratedTopics] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  // Generation params
  const [industry, setIndustry] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [tone, setTone] = useState<'professional' | 'casual' | 'technical' | 'conversational'>('professional');
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [targetAudience, setTargetAudience] = useState("");

  const handleGenerateTopics = async () => {
    setIsGeneratingTopics(true);
    try {
      const response = await generateBlogTopics({
        industry,
        keywords,
        tone,
        targetAudience
      });

      setGeneratedTopics(response.topics);
      setShowTopicsDialog(true);
      toast.success("Topics generated successfully!");
    } catch (error) {
      console.error("Error generating topics:", error);
      toast.error("Failed to generate topics");
    } finally {
      setIsGeneratingTopics(false);
    }
  };

  const handleSelectTopic = async (topic: any) => {
    setTitle(topic.title);
    setKeywords(topic.keywords);
    setShowTopicsDialog(false);
    toast.success(`Topic selected: ${topic.title}`);
  };

  const handleGenerateBlogPost = async () => {
    if (!title) {
      toast.error("Please enter a title or generate topics first");
      return;
    }

    setIsGeneratingPost(true);
    try {
      const request: GenerateBlogRequest = {
        topic: title,
        keywords,
        tone,
        length,
        targetAudience,
        includeImages: true,
        numImages: 3
      };

      const response = await generateBlogPost(request);

      // Populate all fields
      setTitle(response.title);
      setContent(response.content);
      setExcerpt(response.excerpt);

      // Set SEO metadata
      setSeoMetadata({
        meta_title: response.meta_title,
        meta_description: response.meta_description,
        meta_keywords: response.meta_keywords,
        og_title: response.og_title,
        og_description: response.og_description,
        twitter_title: response.twitter_title,
        twitter_description: response.twitter_description,
        schema_data: response.schema_data
      });

      toast.success("Blog post generated successfully!");
      toast.info("Review and edit the content, then add images");
    } catch (error) {
      console.error("Error generating blog post:", error);
      toast.error("Failed to generate blog post");
    } finally {
      setIsGeneratingPost(false);
    }
  };

  const handleSave = async (publishStatus: BlogPost['status'] = 'draft') => {
    if (!title || !content) {
      toast.error("Please fill in title and content");
      return;
    }

    if (!user) {
      toast.error("You must be logged in to save a blog post");
      return;
    }

    setIsSaving(true);
    try {
      const blogData = {
        title,
        content,
        excerpt: excerpt || content.replace(/<[^>]*>/g, '').slice(0, 160),
        status: publishStatus,
        author_id: user.id,
        ...seoMetadata,
        published_at: publishStatus === 'published' ? new Date().toISOString() : null,
        ai_generated: true,
        is_featured: false
      };

      let postId = blogPostId;

      if (blogPostId) {
        // Update existing post
        const { error } = await supabase
          .from('blog_posts')
          .update(blogData)
          .eq('id', blogPostId);

        if (error) throw error;
      } else {
        // Create new post
        const { data, error } = await supabase
          .from('blog_posts')
          .insert(blogData)
          .select()
          .single();

        if (error) throw error;
        postId = data.id;
        setBlogPostId(data.id);
      }

      // Save images
      if (images.length > 0 && postId) {
        // Delete existing images
        await supabase
          .from('blog_images')
          .delete()
          .eq('blog_post_id', postId);

        // Insert new images
        const imageData = images.map(img => ({
          ...img,
          blog_post_id: postId
        }));

        const { error: imgError } = await supabase
          .from('blog_images')
          .insert(imageData);

        if (imgError) throw imgError;
      }

      toast.success(publishStatus === 'published' ? "Blog post published!" : "Draft saved successfully!");

      if (publishStatus === 'published') {
        navigate('/admin/blog');
      }
    } catch (error) {
      console.error("Error saving blog post:", error);
      toast.error("Failed to save blog post");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = () => {
    if (!seoMetadata.meta_title || !seoMetadata.meta_description) {
      toast.error("Please complete SEO fields before publishing");
      return;
    }
    handleSave('published');
  };

  const handleSendEmail = async () => {
    if (!blogPostId) {
      toast.error("Please save the blog post first");
      return;
    }

    if (status !== 'published') {
      toast.error("Please publish the blog post before sending emails");
      return;
    }

    try {
      toast.info("Sending emails to subscribers...");

      const result = await sendBlogPostEmail({
        blogPostId,
        subject: title,
        previewText: excerpt
      });

      if (result.success) {
        toast.success(`Email sent to ${result.recipientCount} subscribers!`);
      } else {
        toast.error(result.error || "Failed to send emails");
      }
    } catch (error) {
      console.error("Error sending emails:", error);
      toast.error("Failed to send emails");
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Create Blog Post</h1>
            <p className="text-muted-foreground">AI-powered SEO-optimized blog creation</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowPreview(true)}
            disabled={!content}
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSave('draft')}
            disabled={isSaving || !title || !content}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </>
            )}
          </Button>
          <Button
            onClick={handlePublish}
            disabled={isSaving || !title || !content}
          >
            <Send className="h-4 w-4 mr-2" />
            Publish
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Sidebar - AI Generation */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Generation</CardTitle>
              <CardDescription>Let AI create your blog post</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Industry/Topic</Label>
                <Input
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g., Technology, Health, Finance"
                />
              </div>

              <div className="space-y-2">
                <Label>Target Audience</Label>
                <Input
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="e.g., Developers, Marketers"
                />
              </div>

              <div className="space-y-2">
                <Label>Tone</Label>
                <Select value={tone} onValueChange={(v: any) => setTone(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="conversational">Conversational</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Length</Label>
                <Select value={length} onValueChange={(v: any) => setLength(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short (~800 words)</SelectItem>
                    <SelectItem value="medium">Medium (~1500 words)</SelectItem>
                    <SelectItem value="long">Long (~2500 words)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleGenerateTopics}
                disabled={isGeneratingTopics}
                className="w-full"
                variant="outline"
              >
                {isGeneratingTopics ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating Topics...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Topics
                  </>
                )}
              </Button>

              <Button
                onClick={handleGenerateBlogPost}
                disabled={isGeneratingPost || !title}
                className="w-full"
              >
                {isGeneratingPost ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating Post...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Blog Post
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {blogPostId && (
            <Card>
              <CardHeader>
                <CardTitle>Distribution</CardTitle>
                <CardDescription>Share your published post</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleSendEmail}
                  disabled={status !== 'published'}
                  className="w-full"
                  variant="outline"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send to All Users
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="content" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="images">Images</TabsTrigger>
              <TabsTrigger value="seo">SEO</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter your blog post title"
                  className="text-2xl font-bold"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="excerpt">Excerpt (Optional)</Label>
                <Input
                  id="excerpt"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="Brief summary of your post"
                />
              </div>

              <BlogEditor
                content={content}
                onChange={setContent}
              />
            </TabsContent>

            <TabsContent value="images">
              <BlogImageManager
                images={images}
                onChange={setImages}
                blogPostId={blogPostId || undefined}
              />
            </TabsContent>

            <TabsContent value="seo">
              <SEOFields
                metadata={seoMetadata}
                onChange={setSeoMetadata}
                title={title}
                content={content}
              />
            </TabsContent>

            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>Post Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Topics Dialog */}
      <Dialog open={showTopicsDialog} onOpenChange={setShowTopicsDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Select a Topic</DialogTitle>
            <DialogDescription>
              Choose one of these AI-generated topics for your blog post
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {generatedTopics.map((topic, index) => (
              <Card
                key={index}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => handleSelectTopic(topic)}
              >
                <CardHeader>
                  <CardTitle className="text-lg">{topic.title}</CardTitle>
                  <CardDescription>{topic.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-2">
                      {topic.keywords.map((keyword: string, i: number) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                    <span className="text-sm font-medium">
                      SEO Score: {topic.seoScore}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {excerpt && <DialogDescription>{excerpt}</DialogDescription>}
          </DialogHeader>

          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
