import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { GlobalHeader } from "@/components/GlobalHeader";
import { Footer } from "@/components/Footer";
import { BookOpen, Calendar, User } from "lucide-react";
import { toast } from "sonner";

const Blog = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    document.title = "Blog - Artifio.ai";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Stay updated with AI tips, tutorials, and product updates from Artifio.');
    }
  }, []);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log("Newsletter signup:", email);
    toast.success("Thanks for subscribing! We'll notify you when we publish.");
    setEmail("");
    setIsSubmitting(false);
  };

  const placeholderPosts = [
    {
      title: "Getting Started with AI Image Generation",
      category: "Tutorials",
      date: "Coming Soon",
      excerpt: "Learn how to create stunning images with AI in minutes"
    },
    {
      title: "10 AI Tips for Content Creators",
      category: "AI Tips",
      date: "Coming Soon",
      excerpt: "Expert tips to level up your AI-generated content"
    },
    {
      title: "What's New in Artifio",
      category: "Product Updates",
      date: "Coming Soon",
      excerpt: "Latest features and improvements to the platform"
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
      <GlobalHeader />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center">
            <BookOpen className="h-16 w-16 mx-auto mb-6 text-primary" />
            <h1 className="text-4xl md:text-6xl font-black mb-6">
              Artifio Blog
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground">
              Stay updated with AI tips, tutorials, and product updates
            </p>
          </div>
        </section>

        {/* Empty State */}
        <section className="container mx-auto px-4 py-12">
          <Card className="max-w-2xl mx-auto border-4 border-primary">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <BookOpen className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-3xl font-black mb-4">Blog Coming Soon</h2>
              <p className="text-lg text-muted-foreground mb-6">
                We're working on awesome content for you. Subscribe below to get notified when we publish our first posts!
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Newsletter Signup */}
        <section className="container mx-auto px-4 py-12">
          <Card className="max-w-xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Subscribe to Our Newsletter</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubscribe} className="space-y-4">
                <div>
                  <Input
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-12" 
                  variant="neon"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Subscribing..." : "Get Notified When We Publish"}
                </Button>
                <p className="text-sm text-center text-muted-foreground">
                  We'll only send you the good stuff. No spam, unsubscribe anytime.
                </p>
              </form>
            </CardContent>
          </Card>
        </section>

        {/* Placeholder Posts Preview */}
        <section className="container mx-auto px-4 py-12 md:py-16">
          <h2 className="text-3xl font-black text-center mb-12">What's Coming</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {placeholderPosts.map((post, idx) => (
              <Card key={idx} className="opacity-60">
                <CardContent className="p-6">
                  <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg mb-4 flex items-center justify-center">
                    <BookOpen className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Calendar className="h-3 w-3" />
                    <span>{post.date}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">{post.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{post.excerpt}</p>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="px-2 py-1 bg-primary/10 rounded">
                      {post.category}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Blog;
