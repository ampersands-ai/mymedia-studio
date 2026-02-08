import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Sparkles, Send, ArrowLeft, Plus, X } from "lucide-react";
import { BlogEditor } from "@/components/blog/BlogEditor";
import { SEOFields } from "@/components/blog/SEOFields";
import { ImageGenerationPanel, type SuggestedImage } from "@/components/blog/ImageGenerationPanel";
import { SEOMetadata } from "@/types/blog";
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

interface TopicSuggestion {
  title: string;
  description: string;
  keywords?: string[];
  seoScore: number;
}

// Extended interface for local use (includes url from API)
interface SuggestedImageWithUrl extends SuggestedImage {
  url: string;
}

export default function CreateBlog() {
  const router = useRouter();
  const { execute } = useErrorHandler();
  const [isGeneratingTopics, setIsGeneratingTopics] = useState(false);
  const [isGeneratingPost, setIsGeneratingPost] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);

  // Topic generation state
  const [industry, setIndustry] = useState("AI & Technology");
  const [topicKeywords, setTopicKeywords] = useState<string[]>(["ai", "technology"]);
  const [keywordInput, setKeywordInput] = useState("");
  const [topicTone, setTopicTone] = useState<"professional" | "casual" | "technical" | "conversational">("professional");
  const [targetAudience, setTargetAudience] = useState("general audience");
  const [suggestedTopics, setSuggestedTopics] = useState<TopicSuggestion[]>([]);
  const [selectedAIModel, setSelectedAIModel] = useState("claude-3-5-sonnet-20241022");

  // Blog post state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [_status, _setStatus] = useState<"draft" | "published">("draft");
  const [isFeatured, setIsFeatured] = useState(false);
  const [featuredImageUrl, setFeaturedImageUrl] = useState("");
  const [seoMetadata, setSeoMetadata] = useState<SEOMetadata>({});
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [suggestedImages, setSuggestedImages] = useState<SuggestedImageWithUrl[]>([]);

  // Backlinks state
  const [backlinks, setBacklinks] = useState<Array<{ url: string; anchor_text: string; is_internal: boolean }>>([]);
  const [backlinkUrl, setBacklinkUrl] = useState("");
  const [backlinkText, setBacklinkText] = useState("");

  const handleGenerateTopics = async () => {
    setIsGeneratingTopics(true);
    try {
      await execute(
        async () => {
          const { data, error } = await supabase.functions.invoke('generate-blog-topics', {
            body: {
              industry,
              keywords: topicKeywords,
              tone: topicTone,
              targetAudience,
              aiModel: selectedAIModel,
            },
          });

          if (error) throw error;

          setSuggestedTopics(data.topics);
        },
        {
          successMessage: `Generated ${suggestedTopics.length || 'multiple'} topic ideas!`,
          errorMessage: 'Failed to generate topics',
          context: {
            component: 'CreateBlog',
            operation: 'handleGenerateTopics',
            industry,
            keywordCount: topicKeywords.length
          }
        }
      );
    } finally {
      setIsGeneratingTopics(false);
    }
  };

  const handleSelectTopic = (topic: TopicSuggestion) => {
    setTitle(topic.title);
    setSlug(topic.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
    toast.success('Topic selected! Click "Generate Blog Post" to create content.');
  };

  const handleGenerateBlogPost = async () => {
    if (!title) {
      toast.error('Please enter or select a topic first');
      return;
    }

    setIsGeneratingPost(true);
    try {
      await execute(
        async () => {
          const { data, error } = await supabase.functions.invoke('generate-blog-post', {
            body: {
              topic: title,
              keywords: topicKeywords,
              tone: topicTone,
              length: 'medium',
              includeImages: true,
              numImages: 3,
              targetAudience,
              internalLinks: backlinks.filter(b => b.is_internal),
              externalLinks: backlinks.filter(b => !b.is_internal),
              aiModel: selectedAIModel,
            },
          });

          if (error) throw error;

          // Populate all fields
          setTitle(data.title);
          setSlug(data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
          setContent(data.content);
          setExcerpt(data.excerpt);
          setSeoMetadata({
            meta_title: data.meta_title,
            meta_description: data.meta_description,
            meta_keywords: data.meta_keywords,
            og_title: data.og_title,
            og_description: data.og_description,
            twitter_title: data.twitter_title,
            twitter_description: data.twitter_description,
            schema_data: data.schema_data,
          });
          setTags(data.tags || []);
          // Ensure suggested images have required fields
          setSuggestedImages((data.suggested_images || []).map((img: any, idx: number) => ({
            url: img.url || '',
            alt_text: img.alt_text || '',
            prompt: img.prompt || img.url || '',
            position: img.position ?? idx,
          })));
        },
        {
          successMessage: 'Blog post generated successfully! Review and edit as needed.',
          errorMessage: 'Failed to generate blog post',
          context: {
            component: 'CreateBlog',
            operation: 'handleGenerateBlogPost',
            topic: title,
            backlinkCount: backlinks.length
          }
        }
      );
    } finally {
      setIsGeneratingPost(false);
    }
  };

  const handleAddKeyword = () => {
    if (keywordInput && !topicKeywords.includes(keywordInput)) {
      setTopicKeywords([...topicKeywords, keywordInput]);
      setKeywordInput("");
    }
  };

  const handleAddTag = () => {
    if (tagInput && !tags.includes(tagInput)) {
      setTags([...tags, tagInput]);
      setTagInput("");
    }
  };

  const handleAddBacklink = () => {
    if (backlinkUrl && backlinkText) {
      setBacklinks([...backlinks, {
        url: backlinkUrl,
        anchor_text: backlinkText,
        is_internal: backlinkUrl.startsWith('/') || backlinkUrl.includes('artifio'),
      }]);
      setBacklinkUrl("");
      setBacklinkText("");
    }
  };

  const handleSaveDraft = async () => {
    await handleSave('draft');
  };

  const handlePublish = async () => {
    await handleSave('published');
  };

  const handlePublishAndEmail = async () => {
    setShowEmailDialog(true);
  };

  const handleConfirmEmail = async () => {
    setShowEmailDialog(false);
    const postId = await handleSave('published');
    if (postId) {
      await sendEmailDistribution(postId);
    }
  };

  const handleSave = async (saveStatus: 'draft' | 'published'): Promise<string | null> => {
    if (!title || !content) {
      toast.error('Title and content are required');
      return null;
    }

    setIsSaving(true);
    try {
      const result = await execute(
        async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Not authenticated');

          const finalSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

          const { data: post, error } = await supabase
            .from('blog_posts')
            .insert({
              author_id: user.id,
              title,
              slug: finalSlug,
              content,
              excerpt,
              status: saveStatus,
              published_at: saveStatus === 'published' ? new Date().toISOString() : null,
              is_featured: isFeatured,
              featured_image_url: featuredImageUrl,
              ai_generated: true,
              generation_prompt: title,
              reading_time: Math.ceil(content.replace(/<[^>]*>/g, '').split(/\s+/).length / 200),
              ...seoMetadata,
            })
            .select()
            .single();

          if (error) throw error;

          // Insert backlinks if any
          if (backlinks.length > 0 && post) {
            await supabase.from('blog_backlinks').insert(
              backlinks.map((link, i) => ({
                blog_post_id: post.id,
                url: link.url,
                anchor_text: link.anchor_text,
                is_internal: link.is_internal,
                position: i,
              }))
            );
          }

          return post.id;
        },
        {
          successMessage: saveStatus === 'published' ? 'Blog post published!' : 'Draft saved!',
          errorMessage: 'Failed to save blog post',
          context: {
            component: 'CreateBlog',
            operation: 'handleSave',
            saveStatus,
            hasBacklinks: backlinks.length > 0
          }
        }
      );
      return result || null;
    } catch (error) {
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const sendEmailDistribution = async (postId: string) => {
    setIsSendingEmail(true);
    try {
      await execute(
        async () => {
          const { data, error } = await supabase.functions.invoke('send-blog-email-distribution', {
            body: { blogPostId: postId },
          });

          if (error) throw error;

          toast.success(`Email sent to ${data.sent} users!`, {
            description: data.failed > 0 ? `${data.failed} failed to send` : undefined,
          });
        },
        {
          showSuccessToast: false,
          errorMessage: 'Failed to send emails',
          context: {
            component: 'CreateBlog',
            operation: 'sendEmailDistribution',
            postId
          }
        }
      );
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold">Create Blog Post</h1>
          <p className="text-muted-foreground mt-2">Generate SEO-optimized content with AI</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/admin')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Admin
        </Button>
      </div>

      {/* AI Model Selection */}
      <Card className="p-6 mb-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
        <h2 className="text-2xl font-bold mb-4">🤖 AI Model Selection</h2>
        <div className="space-y-2">
          <Label htmlFor="ai-model">Select AI Model for Content Generation</Label>
          <Select value={selectedAIModel} onValueChange={setSelectedAIModel}>
            <SelectTrigger id="ai-model" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="claude-3-5-sonnet-20241022">
                <div className="flex items-center justify-between w-full">
                  <span>Claude 3.5 Sonnet</span>
                  <Badge variant="default" className="ml-2">Best Quality</Badge>
                </div>
              </SelectItem>
              <SelectItem value="claude-3-5-haiku-20241022">
                <div className="flex items-center justify-between w-full">
                  <span>Claude 3.5 Haiku</span>
                  <Badge variant="secondary" className="ml-2">Fast</Badge>
                </div>
              </SelectItem>
              <SelectItem value="gpt-4o">
                <div className="flex items-center justify-between w-full">
                  <span>ChatGPT-4o</span>
                  <Badge variant="default" className="ml-2">Premium</Badge>
                </div>
              </SelectItem>
              <SelectItem value="gpt-4o-mini">
                <div className="flex items-center justify-between w-full">
                  <span>ChatGPT-4o Mini</span>
                  <Badge variant="secondary" className="ml-2">Balanced</Badge>
                </div>
              </SelectItem>
              <SelectItem value="grok-beta">
                <div className="flex items-center justify-between w-full">
                  <span>Grok Beta (xAI)</span>
                  <Badge variant="outline" className="ml-2">Latest</Badge>
                </div>
              </SelectItem>
              <SelectItem value="gemini-2.0-flash-exp">
                <div className="flex items-center justify-between w-full">
                  <span>Gemini 2.0 Flash</span>
                  <Badge variant="secondary" className="ml-2">Experimental</Badge>
                </div>
              </SelectItem>
              <SelectItem value="gemini-1.5-pro">
                <div className="flex items-center justify-between w-full">
                  <span>Gemini 1.5 Pro</span>
                  <Badge variant="default" className="ml-2">Pro</Badge>
                </div>
              </SelectItem>
              <SelectItem value="gemini-1.5-flash">
                <div className="flex items-center justify-between w-full">
                  <span>Gemini 1.5 Flash</span>
                  <Badge variant="secondary" className="ml-2">Fast</Badge>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            This model will be used for both topic generation and blog post creation
          </p>
        </div>
      </Card>

      {/* Step 1: Generate Topic */}
      <Card className="p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4">🎯 Step 1: Generate Topic Ideas (Optional)</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Industry</Label>
              <Input value={industry} onChange={(e) => setIndustry(e.target.value)} />
            </div>
            <div>
              <Label>Target Audience</Label>
              <Input value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Keywords</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
                placeholder="Add keyword..."
              />
              <Button onClick={handleAddKeyword} size="sm"><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {topicKeywords.map((kw) => (
                <Badge key={kw} variant="secondary">
                  {kw}
                  <X
                    className="ml-1 h-3 w-3 cursor-pointer"
                    onClick={() => setTopicKeywords(topicKeywords.filter(k => k !== kw))}
                  />
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <Label>Tone</Label>
            <Select value={topicTone} onValueChange={(v) => setTopicTone(v as typeof topicTone)}>
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
          <Button onClick={handleGenerateTopics} disabled={isGeneratingTopics} className="w-full">
            {isGeneratingTopics ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generate Topic Ideas
          </Button>

          {suggestedTopics.length > 0 && (
            <div className="space-y-2 mt-4">
              <Label>Suggested Topics:</Label>
              {suggestedTopics.map((topic, i) => (
                <Card key={i} className="p-4 cursor-pointer hover:bg-accent" onClick={() => handleSelectTopic(topic)}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold">{topic.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{topic.description}</p>
                      <div className="flex gap-1 mt-2">
                        {topic.keywords?.map((kw: string) => (
                          <Badge key={kw} variant="outline" className="text-xs">{kw}</Badge>
                        ))}
                      </div>
                    </div>
                    <Badge variant={topic.seoScore > 80 ? "default" : "secondary"}>
                      SEO: {topic.seoScore}%
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Step 2: Generate Blog Post */}
      <Card className="p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4">✍️ Step 2: Generate Blog Post with SEO</h2>
        <div className="space-y-4">
          <div>
            <Label>Topic / Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter topic or select from suggestions above" />
          </div>
          <div>
            <Label>URL Slug</Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto-generated-from-title" />
          </div>
          <Button onClick={handleGenerateBlogPost} disabled={isGeneratingPost || !title} className="w-full">
            {isGeneratingPost ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generate Blog Post with SEO
          </Button>
        </div>
      </Card>

      {/* Content Editor */}
      <Card className="p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4">📝 Content Editor</h2>
        <BlogEditor content={content} onChange={setContent} />
      </Card>

      {/* AI Image Generation */}
      {title && (
        <div className="mb-6">
          <ImageGenerationPanel
            suggestedImages={suggestedImages}
            onImageGenerated={(_image) => {
              toast.success('Image generated! HTML copied - paste into editor.');
              // Optionally auto-insert into content
              // setContent(content + `\n<img src="${image.url}" alt="${image.alt_text}" class="rounded-lg shadow-lg my-4" />\n`);
            }}
            blogTitle={title}
          />
        </div>
      )}

      {/* Excerpt */}
      <Card className="p-6 mb-6">
        <Label>Excerpt (150-160 characters)</Label>
        <Input
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="Brief summary of the post..."
          maxLength={160}
        />
        <p className="text-xs text-muted-foreground mt-1">{excerpt.length}/160 characters</p>
      </Card>

      {/* SEO Fields */}
      <SEOFields metadata={seoMetadata} onChange={setSeoMetadata} title={title} content={content} />

      {/* Backlinks */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">🔗 Backlinks & Internal Links</h2>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="URL (e.g., /templates or https://example.com)"
              value={backlinkUrl}
              onChange={(e) => setBacklinkUrl(e.target.value)}
            />
            <Input
              placeholder="Anchor text"
              value={backlinkText}
              onChange={(e) => setBacklinkText(e.target.value)}
            />
            <Button onClick={handleAddBacklink} size="sm"><Plus className="h-4 w-4" /></Button>
          </div>
          {backlinks.length > 0 && (
            <div className="space-y-2">
              {backlinks.map((link, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-accent rounded">
                  <div>
                    <Badge variant={link.is_internal ? "default" : "secondary"} className="mr-2">
                      {link.is_internal ? 'Internal' : 'External'}
                    </Badge>
                    <span className="text-sm">{link.anchor_text}</span>
                    <span className="text-xs text-muted-foreground ml-2">→ {link.url}</span>
                  </div>
                  <X
                    className="h-4 w-4 cursor-pointer"
                    onClick={() => setBacklinks(backlinks.filter((_, idx) => idx !== i))}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Publishing Options */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">📊 Publishing Options</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              id="featured"
            />
            <Label htmlFor="featured">Featured Post</Label>
          </div>
          <div>
            <Label>Featured Image URL</Label>
            <Input
              value={featuredImageUrl}
              onChange={(e) => setFeaturedImageUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div>
            <Label>Tags</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder="Add tag..."
              />
              <Button onClick={handleAddTag} size="sm"><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge key={tag}>
                  {tag}
                  <X
                    className="ml-1 h-3 w-3 cursor-pointer"
                    onClick={() => setTags(tags.filter(t => t !== tag))}
                  />
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button variant="outline" onClick={handleSaveDraft} disabled={isSaving}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save as Draft
        </Button>
        <Button onClick={handlePublish} disabled={isSaving}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Publish
        </Button>
        <Button onClick={handlePublishAndEmail} disabled={isSaving || isSendingEmail}>
          {isSendingEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Publish & Email Users
        </Button>
      </div>

      {/* Email Confirmation Dialog */}
      <AlertDialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Blog Post to All Users?</AlertDialogTitle>
            <AlertDialogDescription>
              This will send an email notification to all registered users about this blog post.
              Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmEmail}>Send Emails</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
