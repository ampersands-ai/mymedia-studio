import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { Input } from "@/components/ui/input";
import { GlobalHeader } from "@/components/GlobalHeader";
import { Footer } from "@/components/Footer";
import { Helmet } from "react-helmet-async";
import { BlogPost } from "@/types/blog";
import { Clock, Eye, Calendar } from "lucide-react";
import { brand, pageTitle } from '@/config/brand';

export default function BlogList() {
  const { execute } = useErrorHandler();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<BlogPost[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = posts.filter(post =>
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.excerpt?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredPosts(filtered);
    } else {
      setFilteredPosts(posts);
    }
  }, [searchQuery, posts]);

  const fetchPosts = async () => {
    try {
      await execute(
        async () => {
          const { data, error } = await supabase
            .from('blog_posts')
            .select('*')
            .eq('status', 'published')
            .order('published_at', { ascending: false });

          if (error) throw error;
          setPosts(data as BlogPost[] || []);
          setFilteredPosts(data as BlogPost[] || []);
        },
        {
          showSuccessToast: false,
          context: {
            component: 'BlogList',
            operation: 'fetchPosts',
          }
        }
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{pageTitle('Blog')}</title>
        <meta name="description" content={`Read the latest insights, tutorials, and updates about AI technology from ${brand.name}.`} />
      </Helmet>

      <GlobalHeader />

      <div className="min-h-screen pt-20 pb-16">
        <div className="container mx-auto px-4">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              {brand.name} Blog
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Insights, tutorials, and the latest updates in AI technology
            </p>
            <div className="max-w-md mx-auto">
              <Input
                placeholder="Search blog posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12"
              />
            </div>
          </div>

          {/* Blog Grid */}
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading posts...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchQuery ? 'No posts found matching your search.' : 'No blog posts yet.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {filteredPosts.map((post) => (
                <Link key={post.id} to={`/blog/${post.slug}`}>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col">
                    {post.featured_image_url && (
                      <div className="aspect-video overflow-hidden">
                        <img
                          src={post.featured_image_url}
                          alt={post.title}
                          className="w-full h-full object-cover hover:scale-105 transition-transform"
                        />
                      </div>
                    )}
                    <div className="p-6 flex flex-col flex-1">
                      {post.is_featured && (
                        <Badge className="mb-3 w-fit">Featured</Badge>
                      )}
                      <h2 className="text-2xl font-bold mb-3 line-clamp-2 hover:text-primary transition-colors">
                        {post.title}
                      </h2>
                      {post.excerpt && (
                        <p className="text-muted-foreground mb-4 line-clamp-3 flex-1">
                          {post.excerpt}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-auto pt-4 border-t">
                        {post.published_at && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(post.published_at).toLocaleDateString()}
                          </div>
                        )}
                        {post.reading_time && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {post.reading_time} min
                          </div>
                        )}
                        <div className="flex items-center gap-1 ml-auto">
                          <Eye className="h-4 w-4" />
                          {post.view_count}
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </>
  );
}
