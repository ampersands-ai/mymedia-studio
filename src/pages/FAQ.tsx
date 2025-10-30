import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GlobalHeader } from "@/components/GlobalHeader";
import { Footer } from "@/components/Footer";
import { FAQAccordion } from "@/components/homepage/FAQAccordion";
import { HelpCircle, Mail } from "lucide-react";

const FAQ = () => {
  useEffect(() => {
    document.title = "FAQ - Artifio.ai";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Frequently asked questions about Artifio - pricing, tokens, features, and getting started with AI content generation.');
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
      <GlobalHeader />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center">
            <HelpCircle className="h-16 w-16 mx-auto mb-6 text-primary" />
            <h1 className="text-4xl md:text-6xl font-black mb-6">
              Frequently Asked Questions
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground">
              Everything you need to know about Artifio
            </p>
          </div>
        </section>

        {/* FAQ Accordion */}
        <section className="container mx-auto px-4 py-12 md:py-16">
          <div className="max-w-3xl mx-auto">
            <FAQAccordion />
          </div>
        </section>

        {/* Additional FAQs */}
        <section className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-black mb-6">More Questions?</h2>
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-lg mb-2">What is Artifio?</h3>
                    <p className="text-muted-foreground">
                      Artifio is an all-in-one AI content generation platform that gives you access to 20+ AI models for creating images, videos, audio, and text. Instead of juggling multiple subscriptions, you get everything in one place with simple, transparent pricing.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-bold text-lg mb-2">How does the token system work?</h3>
                    <p className="text-muted-foreground">
                      Tokens are our unit of measurement. Each AI generation costs a certain number of tokens depending on the model and complexity. You can see the exact cost before creating anything. No surprises, no hidden fees.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-bold text-lg mb-2">How do I get started?</h3>
                    <p className="text-muted-foreground">
                      Simply sign up for a free account and you'll get 5 credits to start exploring. Choose a template or model, enter your prompt, and create. It's that easy!
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-bold text-lg mb-2">What's your refund policy?</h3>
                    <p className="text-muted-foreground">
                      If you experience technical issues or quality problems with a generation, you can report it through the dispute system. Our team will review and issue refunds for valid claims. We want you to be happy with every creation.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-bold text-lg mb-2">Can I switch plans anytime?</h3>
                    <p className="text-muted-foreground">
                      Yes! You can upgrade, downgrade, or cancel your subscription at any time. Changes take effect at the start of your next billing cycle. Your unused tokens roll over as long as your subscription is active.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-bold text-lg mb-2">Do you offer discounts for students or nonprofits?</h3>
                    <p className="text-muted-foreground">
                      We're committed to making AI accessible to everyone. Contact us at support@artifio.ai with proof of student status or nonprofit registration, and we'll work out a special discount for you.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Contact CTA */}
        <section className="container mx-auto px-4 py-16 md:py-24">
          <Card className="max-w-2xl mx-auto border-4 border-primary">
            <CardContent className="p-8 md:p-12 text-center">
              <Mail className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h2 className="text-3xl md:text-4xl font-black mb-4">Still Have Questions?</h2>
              <p className="text-lg text-muted-foreground mb-6">
                Our team is here to help. Send us an email and we'll get back to you within 24 hours.
              </p>
              <Button asChild size="lg" variant="neon">
                <a href="mailto:support@artifio.ai">Contact Us</a>
              </Button>
              <p className="text-sm text-muted-foreground mt-4">
                support@artifio.ai
              </p>
            </CardContent>
          </Card>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default FAQ;
