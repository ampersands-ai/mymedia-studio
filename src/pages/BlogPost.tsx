import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { GlobalHeader } from "@/components/GlobalHeader";
import { Footer } from "@/components/Footer";
import { BlogPost as BlogPostType, BlogImage } from "@/types/blog";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, ArrowLeft, Share2, Twitter, Facebook, Linkedin } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPostType | null>(null);
  const [images, setImages] = useState<BlogImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      fetchPost();
    }
  }, [slug]);

  const fetchPost = async () => {
    if (!slug) return;

    try {
      // Fetch post
      const { data: postData, error: postError } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .single();

      if (postError) throw postError;

      setPost(postData);

      // Increment view count
      await supabase.rpc('increment_blog_view_count', { post_id: postData.id });

      // Fetch images
      const { data: imagesData, error: imagesError } = await supabase
        .from('blog_images')
        .select('*')
        .eq('blog_post_id', postData.id)
        .order('position');

      if (!imagesError && imagesData) {
        setImages(imagesData);
      }
    } catch (error) {
      console.error('Error fetching blog post:', error);
      toast.error('Blog post not found');
      navigate('/blog');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleShare = async (platform: 'twitter' | 'facebook' | 'linkedin' | 'copy') => {
    const url = window.location.href;
    const title = post?.title || '';

    switch (platform) {
      case 'twitter':
        window.open(
          `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
          '_blank'
        );
        break;
      case 'facebook':
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
          '_blank'
        );
        break;
      case 'linkedin':
        window.open(
          `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
          '_blank'
        );
        break;
      case 'copy':
        try {
          await navigator.clipboard.writeText(url);
          toast.success('Link copied to clipboard!');
        } catch (error) {
          toast.error('Failed to copy link');
        }
        break;
    }

    // Increment share count
    if (post) {
      await supabase.rpc('increment_blog_share_count', { post_id: post.id });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <GlobalHeader />
        <div className="container mx-auto px-4 py-12 max-w-4xl flex-1">
          <div className="animate-pulse space-y-8">
            <div className="h-12 bg-muted rounded w-3/4"></div>
            <div className="h-6 bg-muted rounded w-1/2"></div>
            <div className="h-96 bg-muted rounded"></div>
            <div className="space-y-4">
              <div className="h-4 bg-muted rounded"></div>
              <div className="h-4 bg-muted rounded"></div>
              <div className="h-4 bg-muted rounded w-5/6"></div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!post) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>{post.meta_title || post.title} | Artifio</title>
        <meta name="description" content={post.meta_description || post.excerpt || ''} />
        {post.meta_keywords && (
          <meta name="keywords" content={post.meta_keywords.join(', ')} />
        )}

        {/* Open Graph */}
        <meta property="og:title" content={post.og_title || post.title} />
        <meta property="og:description" content={post.og_description || post.excerpt || ''} />
        {post.og_image_url && <meta property="og:image" content={post.og_image_url} />}
        <meta property="og:type" content="article" />
        {post.published_at && (
          <meta property="article:published_time" content={post.published_at} />
        )}

        {/* Twitter Card */}
        <meta name="twitter:card" content={post.twitter_card_type || 'summary_large_image'} />
        <meta name="twitter:title" content={post.twitter_title || post.title} />
        <meta name="twitter:description" content={post.twitter_description || post.excerpt || ''} />
        {post.twitter_image_url && (
          <meta name="twitter:image" content={post.twitter_image_url} />
        )}

        {/* Canonical URL */}
        {post.canonical_url && <link rel="canonical" href={post.canonical_url} />}

        {/* Structured Data */}
        {post.schema_data && (
          <script type="application/ld+json">
            {JSON.stringify({
              ...post.schema_data,
              datePublished: post.published_at,
              image: post.featured_image_url || post.og_image_url
            })}
          </script>
        )}
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <GlobalHeader />

        <article className="container mx-auto px-4 py-12 max-w-4xl flex-1">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => navigate('/blog')}
            className="mb-8"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Blog
          </Button>

          {/* Article Header */}
          <header className="mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">{post.title}</h1>

            {post.excerpt && (
              <p className="text-xl text-muted-foreground mb-6">{post.excerpt}</p>
            )}

            <div className="flex items-center gap-6 text-sm text-muted-foreground mb-6">
              {post.published_at && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(post.published_at)}
                </div>
              )}
              {post.reading_time && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {post.reading_time} min read
                </div>
              )}
              {post.view_count > 0 && (
                <span>{post.view_count.toLocaleString()} views</span>
              )}
            </div>

            {/* Tags */}
            {post.meta_keywords && post.meta_keywords.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {post.meta_keywords.map((keyword, index) => (
                  <Badge key={index} variant="secondary">
                    {keyword}
                  </Badge>
                ))}
              </div>
            )}

            {/* Featured Image */}
            {post.featured_image_url && (
              <img
                src={post.featured_image_url}
                alt={post.title}
                className="w-full rounded-lg mb-6"
              />
            )}

            <Separator />
          </header>

          {/* Article Content */}
          <div
            className="prose prose-lg max-w-none mb-12"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Share Buttons */}
          <div className="border-t border-b py-6 mb-12">
            <h3 className="text-lg font-semibold mb-4">Share this article</h3>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleShare('twitter')}
              >
                <Twitter className="h-4 w-4 mr-2" />
                Twitter
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleShare('facebook')}
              >
                <Facebook className="h-4 w-4 mr-2" />
                Facebook
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleShare('linkedin')}
              >
                <Linkedin className="h-4 w-4 mr-2" />
                LinkedIn
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleShare('copy')}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Copy Link
              </Button>
            </div>
          </div>

          {/* CTA */}
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-8 rounded-lg text-center">
            <h3 className="text-2xl font-bold mb-4">Try Artifio Today</h3>
            <p className="text-muted-foreground mb-6">
              Create stunning AI-generated content in minutes
            </p>
            <Button size="lg" onClick={() => navigate('/signup')}>
              Get Started Free
            </Button>
          </div>
        </article>

        <Footer />
      </div>
    </>
  );
}
