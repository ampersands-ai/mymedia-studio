import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlobalHeader } from "@/components/GlobalHeader";
import { Footer } from "@/components/Footer";
import { Helmet } from "react-helmet-async";
import type { BlogPost as BlogPostType } from "@/types/blog";
import { Share2, Clock, Eye, Calendar, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import DOMPurify from "dompurify";
import { useErrorHandler } from "@/hooks/useErrorHandler";

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const { execute } = useErrorHandler();
  const [post, setPost] = useState<BlogPostType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Sanitize blog content to prevent XSS attacks
  const sanitizedContent = useMemo(() => {
    if (!post?.content) return '';
    return DOMPurify.sanitize(post.content, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'code', 'pre'],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id']
    });
  }, [post?.content]);

  useEffect(() => {
    if (slug) {
      fetchPost();
    }
  }, [slug]);

  const fetchPost = async () => {
    try {
      await execute(
        async () => {
          const { data, error } = await supabase
            .from('blog_posts')
            .select('*')
            .eq('slug', slug)
            .eq('status', 'published')
            .single();

          if (error) throw error;

          setPost(data as BlogPostType);

          // Increment view count
          if (data) {
            await supabase.rpc('increment_blog_view_count', { post_id: data.id });
          }
        },
        {
          showSuccessToast: false,
          context: {
            component: 'BlogPost',
            operation: 'fetchPost',
            slug,
          }
        }
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (!post) return;

    await execute(
      async () => {
        if (navigator.share) {
          await navigator.share({
            title: post.title,
            text: post.excerpt || '',
            url: window.location.href,
          });
        } else {
          await navigator.clipboard.writeText(window.location.href);
          toast.success('Link copied to clipboard!');
        }

        // Increment share count
        await supabase.rpc('increment_blog_share_count', { post_id: post.id });
      },
      {
        showSuccessToast: false, // We show custom toast for clipboard
        context: {
          component: 'BlogPost',
          operation: 'handleShare',
          postId: post.id,
        }
      }
    );
  };

  if (isLoading) {
    return (
      <>
        <GlobalHeader />
        <div className="min-h-screen pt-20 flex items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
        <Footer />
      </>
    );
  }

  if (!post) {
    return (
      <>
        <GlobalHeader />
        <div className="min-h-screen pt-20 flex flex-col items-center justify-center">
          <h1 className="text-4xl font-bold mb-4">Post Not Found</h1>
          <Link to="/blog">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Blog
            </Button>
          </Link>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{post.meta_title || post.title}</title>
        <meta name="description" content={post.meta_description || post.excerpt || ''} />
        {post.meta_keywords && <meta name="keywords" content={post.meta_keywords.join(', ')} />}
        {post.canonical_url && <link rel="canonical" href={post.canonical_url} />}
        
        {/* Open Graph */}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={post.og_title || post.title} />
        <meta property="og:description" content={post.og_description || post.excerpt || ''} />
        {post.og_image_url && <meta property="og:image" content={post.og_image_url} />}
        <meta property="og:url" content={window.location.href} />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content={post.twitter_card_type || 'summary_large_image'} />
        <meta name="twitter:title" content={post.twitter_title || post.title} />
        <meta name="twitter:description" content={post.twitter_description || post.excerpt || ''} />
        {post.twitter_image_url && <meta name="twitter:image" content={post.twitter_image_url} />}
        
        {/* Schema.org */}
        {post.schema_data && (
          <script type="application/ld+json">
            {JSON.stringify(post.schema_data)}
          </script>
        )}
      </Helmet>

      <GlobalHeader />

      <article className="min-h-screen pt-20 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Back Button */}
          <Link to="/blog" className="inline-block mb-8">
            <Button variant="ghost">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Blog
            </Button>
          </Link>

          {/* Featured Image */}
          {post.featured_image_url && (
            <div className="aspect-video rounded-xl overflow-hidden mb-8">
              <img
                src={post.featured_image_url}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Header */}
          <header className="mb-8">
            {post.is_featured && (
              <Badge className="mb-4">Featured</Badge>
            )}
            <h1 className="text-5xl font-bold mb-4">{post.title}</h1>
            {post.excerpt && (
              <p className="text-xl text-muted-foreground mb-6">{post.excerpt}</p>
            )}
            
            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground pb-6 border-b">
              {post.published_at && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(post.published_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              )}
              {post.reading_time && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {post.reading_time} min read
                </div>
              )}
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                {post.view_count} views
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="ml-auto"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </header>

          {/* Content - Sanitized to prevent XSS */}
          <div
            className="prose prose-lg max-w-none prose-headings:font-bold prose-h2:text-3xl prose-h3:text-2xl prose-p:text-foreground prose-strong:text-foreground prose-a:text-primary hover:prose-a:underline prose-img:rounded-lg prose-img:shadow-lg"
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          />

          {/* Share Button at Bottom */}
          <div className="mt-12 pt-8 border-t flex justify-center">
            <Button onClick={handleShare} size="lg">
              <Share2 className="h-5 w-5 mr-2" />
              Share this post
            </Button>
          </div>
        </div>
      </article>

      <Footer />
    </>
  );
}
