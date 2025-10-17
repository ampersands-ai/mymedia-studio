import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GlobalHeader } from "@/components/GlobalHeader";
import { Footer } from "@/components/Footer";
import { Sparkles, Target, Users } from "lucide-react";

const About = () => {
  useEffect(() => {
    document.title = "About Us - Artifio.ai";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Learn about Artifio - the all-in-one AI platform built for creators who want powerful tools without the complexity or high costs.');
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
      <GlobalHeader />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-black mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-gradient">
              Building AI Tools for Creators
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground">
              Making professional AI generation accessible to everyone
            </p>
          </div>
        </section>

        {/* Story Section */}
        <section className="container mx-auto px-4 py-12 md:py-16">
          <div className="max-w-3xl mx-auto space-y-6">
            <Card>
              <CardContent className="p-6 md:p-8">
                <div className="space-y-4 text-foreground/90">
                  <p className="text-lg leading-relaxed">
                    Artifio was born from a simple frustration: AI tools are either too expensive, too complicated, or scattered across dozens of platforms. As creators ourselves, we spent countless hours juggling subscriptions, learning different interfaces, and watching costs spiral out of control.
                  </p>
                  <p className="text-lg leading-relaxed">
                    We believed there had to be a better way. Why should creating amazing content with AI require a degree in computer science and a corporate budget? So we built Artifio - one platform, 20+ AI models, with transparent pricing that puts you in control.
                  </p>
                  <p className="text-lg leading-relaxed">
                    Today, Artifio serves thousands of creators, from solo content makers to growing agencies. Whether you're generating stunning images, producing professional videos, or creating engaging audio content, we're here to make it simple, affordable, and powerful.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Mission Section */}
        <section className="container mx-auto px-4 py-12 md:py-16">
          <div className="max-w-4xl mx-auto">
            <Card className="border-4 border-primary">
              <CardContent className="p-8 md:p-12 text-center">
                <Sparkles className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h2 className="text-3xl md:text-4xl font-black mb-4">Our Mission</h2>
                <p className="text-xl text-foreground/90 leading-relaxed">
                  To democratize AI creation tools by providing an all-in-one platform that's powerful enough for professionals, simple enough for beginners, and affordable for everyone.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Values Section */}
        <section className="container mx-auto px-4 py-12 md:py-16">
          <h2 className="text-3xl md:text-4xl font-black text-center mb-12">What We Stand For</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <Card>
              <CardContent className="p-6 text-center">
                <Target className="h-10 w-10 mx-auto mb-4 text-primary" />
                <h3 className="text-xl font-bold mb-2">Transparency</h3>
                <p className="text-muted-foreground">
                  No hidden fees. Know exactly what you're paying before you create. Simple token-based pricing.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Sparkles className="h-10 w-10 mx-auto mb-4 text-primary" />
                <h3 className="text-xl font-bold mb-2">Quality</h3>
                <p className="text-muted-foreground">
                  Access to the best AI models from OpenAI, Google, Anthropic, and more. Professional results every time.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="h-10 w-10 mx-auto mb-4 text-primary" />
                <h3 className="text-xl font-bold mb-2">Community</h3>
                <p className="text-muted-foreground">
                  Built by creators, for creators. Your feedback shapes our platform and helps us grow together.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Team Section */}
        <section className="container mx-auto px-4 py-12 md:py-16">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-black text-center mb-12">Meet the Team</h2>
            <Card>
              <CardContent className="p-8 text-center">
                <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Users className="h-12 w-12 text-primary-foreground" />
                </div>
                <h3 className="text-2xl font-bold mb-2">The Artifio Team</h3>
                <p className="text-muted-foreground mb-4">Founders & Creators</p>
                <p className="text-foreground/90">
                  A small but passionate team dedicated to making AI accessible. We're developers, designers, and creators who understand the challenges of modern content creation.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-16 md:py-24">
          <Card className="max-w-2xl mx-auto border-4 border-primary">
            <CardContent className="p-8 md:p-12 text-center">
              <h2 className="text-3xl md:text-4xl font-black mb-4">Ready to Create?</h2>
              <p className="text-lg text-muted-foreground mb-6">
                Join thousands of creators using Artifio to bring their ideas to life
              </p>
              <Button asChild size="lg" variant="neon">
                <a href="/auth">Try Artifio Free</a>
              </Button>
              <p className="text-sm text-muted-foreground mt-4">
                500 free tokens • No credit card required
              </p>
            </CardContent>
          </Card>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default About;
