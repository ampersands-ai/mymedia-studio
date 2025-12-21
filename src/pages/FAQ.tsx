import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GlobalHeader } from "@/components/GlobalHeader";
import { Footer } from "@/components/Footer";
import { HelpCircle, Mail } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqCategories = [
  {
    title: "General",
    faqs: [
      {
        q: "What is Artifio?",
        a: "Artifio is an all-in-one AI content generation platform that gives you access to 30+ AI models for creating videos, images, audio, and text. Instead of juggling multiple subscriptions, you get everything in one place with simple, transparent pricing."
      },
      {
        q: "How is Artifio different from going directly to each AI provider?",
        a: "Three ways: Price - you pay a fraction of what individual subscriptions cost. Convenience - one login, one credit balance, one interface for everything. Flexibility - switch between models instantly without managing multiple accounts."
      },
      {
        q: "Do you build your own AI models?",
        a: "No. We integrate with the world's leading AI providers. You get the same models and outputs as going direct - we just make them accessible and affordable."
      },
      {
        q: "What AI models are available?",
        a: "We currently offer 30+ models including: Video (Veo, Sora, Runway, Kling, Hailuo, Wan, Seedance), Image (Midjourney, FLUX, Ideogram, Google Imagen, Seedream, Grok Imagine, HiDream, Qwen, Recraft), Audio/Voice (ElevenLabs, Suno), and Avatar/Lip-Sync (Kling Avatar, Infinitalk, Wan Speech-to-Video). New models are added regularly."
      },
      {
        q: "Will new models be added?",
        a: "Yes. As new AI models become available, we integrate them into the platform. Your subscription automatically gains access to new models at no extra cost."
      },
      {
        q: "Is this suitable for beginners?",
        a: "Absolutely. Artifio is designed to be intuitive. Choose a model, enter your prompt, and create. No technical skills required. Our interface guides you through every step."
      }
    ]
  },
  {
    title: "Pricing & Plans",
    faqs: [
      {
        q: "What plans do you offer?",
        a: "We offer five tiers: Free, Explorer, Professional, Ultimate, and Studio. Each tier provides a monthly credit allocation, with higher tiers offering more credits and better per-credit value. Annual billing saves you approximately 20% (2+ months free)."
      },
      {
        q: "What's included in the Free plan?",
        a: "5 credits to try the platform. This is a one-time allocation - it does not refill. Free users cannot purchase additional credits."
      },
      {
        q: "What's the difference between monthly and annual billing?",
        a: "Annual billing saves you approximately 20% (2+ months free). You're billed upfront for 12 months at the discounted rate."
      },
      {
        q: "Which plan should I choose?",
        a: "It depends on your usage. Casual creators and hobbyists often start with Explorer. Regular content producers typically choose Professional or Ultimate. High-volume creators and teams prefer Studio for maximum credits and best per-credit value."
      },
      {
        q: "Can I change plans later?",
        a: "Yes! You can upgrade, downgrade, or cancel at any time from your account settings."
      },
      {
        q: "Do you offer refunds?",
        a: "All sales are final. Credits are non-refundable and have no cash value. If you experience technical issues with a generation, you can report it through our dispute system and our team will review."
      },
      {
        q: "Can prices change?",
        a: "Yes. Our pricing depends on costs charged by third-party AI providers. We may adjust pricing to reflect changes in underlying model costs. Annual subscribers are locked at their rate until renewal."
      },
      {
        q: "Do you offer discounts for students or nonprofits?",
        a: "We're committed to making AI accessible to everyone. Contact us at support@artifio.ai with proof of student status or nonprofit registration, and we'll work out a special discount for you."
      }
    ]
  },
  {
    title: "Credits",
    faqs: [
      {
        q: "How does the credit system work?",
        a: "Credits are our unit of measurement for generations. Each AI generation costs a certain number of credits depending on the model and complexity. You can see the exact cost before creating anything. No surprises, no hidden fees."
      },
      {
        q: "Why do different models cost different credits?",
        a: "We pass through the actual cost of each model. More powerful models and longer outputs require more computational resources, so they use more credits. This lets you choose the right tool for your budget and needs."
      },
      {
        q: "Do credits expire?",
        a: "While subscribed: No. Credits roll over indefinitely. After cancellation: Credits are frozen for 30 days. Resubscribe within 30 days to restore them. After 30 days, they're gone."
      },
      {
        q: "What if I run out of credits?",
        a: "Paid subscribers can purchase additional credits at their current plan rate anytime. Or upgrade to a higher tier for more monthly credits. Free users cannot purchase additional credits - upgrade to a paid plan to continue creating."
      },
      {
        q: "What happens to unused credits at the end of my billing cycle?",
        a: "They roll over. There's no \"use it or lose it\" - your credits accumulate as long as you're subscribed."
      },
      {
        q: "Is there a credit cap?",
        a: "No. Your credits accumulate indefinitely while your subscription is active."
      }
    ]
  },
  {
    title: "Upgrades & Downgrades",
    faqs: [
      {
        q: "How do upgrades work?",
        a: "Upgrades take effect immediately. Your billing cycle resets to the upgrade date, you receive full credits for your new tier instantly, and your existing credits remain (new credits are added on top). You only pay the prorated difference for time left on your old plan."
      },
      {
        q: "How do downgrades work?",
        a: "Downgrades take effect at the end of your current billing cycle. You keep access to your current tier until then, and your existing credits stay in your account."
      },
      {
        q: "Can I switch plans anytime?",
        a: "Yes! Upgrades take effect immediately with prorated billing. Downgrades apply at the end of your current billing cycle. Credits never expire while subscribed."
      },
      {
        q: "If I upgrade mid-cycle, do I lose my current credits?",
        a: "No. Your existing credits remain. The new tier's credits are added on top."
      }
    ]
  },
  {
    title: "Cancellation & Account",
    faqs: [
      {
        q: "Can I cancel anytime?",
        a: "Yes. Cancel through your account settings. You'll keep access until your current billing period ends."
      },
      {
        q: "What happens when I cancel?",
        a: "You retain access until your billing cycle ends. After that, your credits are frozen for 30 days. Resubscribe within 30 days to restore your credits. After 30 days, unused credits are permanently removed."
      },
      {
        q: "Can I delete my account?",
        a: "Yes. Account deletion is immediate and permanent. All credits are forfeited instantly. This cannot be undone."
      }
    ]
  },
  {
    title: "Content & Generations",
    faqs: [
      {
        q: "What can I create with Artifio?",
        a: "Videos, images, audio, voiceovers, and music - depending on which models you use."
      },
      {
        q: "What's the quality like compared to Midjourney/Runway?",
        a: "Identical. We use the same underlying models. When you generate with Midjourney on Artifio, you're using the actual Midjourney model. Same for Runway, Sora, and every other model we offer."
      },
      {
        q: "What formats do you support?",
        a: "Output formats vary by model. Common formats include MP4 for video, PNG/JPG for images, and MP3/WAV for audio. Specific formats are shown before generation."
      },
      {
        q: "How long does generation take?",
        a: "Depends on the model and output type. Some images generate in seconds; complex videos may take minutes. Estimated times are shown during generation."
      },
      {
        q: "Are there download limits?",
        a: "No. Download your content as many times as you want."
      },
      {
        q: "How long is my content stored?",
        a: "2 weeks from generation. After that, it's automatically deleted. Download anything you want to keep."
      },
      {
        q: "What happens if a generation fails?",
        a: "If it fails due to a system error, credits are automatically refunded. Failures due to content policy violations or invalid prompts may not be refunded."
      }
    ]
  },
  {
    title: "Content Rights & Usage",
    faqs: [
      {
        q: "Do I own the content I create?",
        a: "Yes, to the extent permitted by law and third-party provider terms. You own your outputs."
      },
      {
        q: "Can I use generated content commercially?",
        a: "Yes. Commercial usage rights are included with paid subscriptions, subject to third-party model provider terms."
      },
      {
        q: "Do you put watermarks on content?",
        a: "No watermarks on paid plans."
      },
      {
        q: "Will my content be unique?",
        a: "AI-generated content may not be unique. Other users with similar prompts could generate similar outputs."
      },
      {
        q: "Do you use my prompts to train AI?",
        a: "No. We do not use your prompts or generated content to train any models."
      }
    ]
  },
  {
    title: "Content Policies",
    faqs: [
      {
        q: "What can't I create?",
        a: "Prohibited content includes: Sexual or explicit content, content involving minors inappropriately, harassment/hate speech/discrimination, violence/gore/self-harm, illegal content, non-consensual imagery of real people, deepfakes without consent, and spam/malware/phishing."
      },
      {
        q: "What happens if I violate content policies?",
        a: "Content is blocked (no credits charged). Repeated violations may result in account suspension or termination without refund."
      },
      {
        q: "Are my prompts screened?",
        a: "Yes. All prompts pass through automated moderation before processing."
      }
    ]
  },
  {
    title: "Technical",
    faqs: [
      {
        q: "What browsers do you support?",
        a: "Modern versions of Chrome, Firefox, Safari, and Edge. We recommend keeping your browser updated."
      },
      {
        q: "Is there a mobile app?",
        a: "Not currently. Artifio works in mobile browsers."
      },
      {
        q: "Is there an API?",
        a: "Not currently available for public use."
      },
      {
        q: "Can I use Artifio offline?",
        a: "No. Artifio requires an internet connection."
      },
      {
        q: "Why is my generation taking a long time?",
        a: "Generation times vary by model and current demand. Complex outputs (longer videos, higher resolutions) take more time. If a generation seems stuck, contact support."
      },
      {
        q: "Why did my generation fail?",
        a: "Common reasons: content policy violation, invalid prompt, model temporarily unavailable, or system error. Check the error message for details."
      }
    ]
  },
  {
    title: "Billing & Payments",
    faqs: [
      {
        q: "What payment methods do you accept?",
        a: "Major credit cards (Visa, Mastercard, American Express) processed through our payment providers."
      },
      {
        q: "Is my payment information secure?",
        a: "Yes. We use secure payment processors. We never store your full card details."
      },
      {
        q: "When am I charged?",
        a: "Monthly subscribers are charged on the same date each month. Annual subscribers are charged upfront for 12 months."
      },
      {
        q: "How do I update my payment method?",
        a: "Go to Account Settings → Billing → Update Payment Method."
      },
      {
        q: "How do I view my billing history?",
        a: "Go to Account Settings → Billing → Billing History."
      },
      {
        q: "Do prices include tax?",
        a: "Prices shown are before tax. Applicable taxes may be added at checkout depending on your location."
      }
    ]
  },
  {
    title: "Teams & Agencies",
    faqs: [
      {
        q: "Can I use this for my agency/team?",
        a: "Yes! Team plans coming soon (5 users, shared credits). For now, you can create separate accounts or contact us at support@artifio.ai for custom enterprise pricing."
      }
    ]
  },
  {
    title: "Support",
    faqs: [
      {
        q: "How do I contact support?",
        a: "Email us at support@artifio.ai. We respond within 24-48 hours."
      },
      {
        q: "Do you have live chat?",
        a: "Not currently."
      },
      {
        q: "Where can I report a bug?",
        a: "Email support@artifio.ai with details about the issue, including what you were trying to do and any error messages."
      },
      {
        q: "How do I report a copyright concern?",
        a: "Send DMCA notices to privacy@artifio.ai with the required information outlined in our Terms of Service."
      }
    ]
  },
  {
    title: "Account Security",
    faqs: [
      {
        q: "How do I get started?",
        a: "Simply sign up for a free account and you'll get 5 credits to start exploring. Choose a model, enter your prompt, and create. It's that easy!"
      },
      {
        q: "How do I reset my password?",
        a: "Click \"Forgot Password\" on the login page. We'll email you a reset link."
      },
      {
        q: "Can I enable two-factor authentication?",
        a: "Not currently available."
      },
      {
        q: "Someone accessed my account without permission. What do I do?",
        a: "Change your password immediately and contact support@artifio.ai. We'll investigate and secure your account."
      }
    ]
  }
];

const FAQ = () => {
  useEffect(() => {
    document.title = "FAQ - Artifio.ai";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Frequently asked questions about Artifio - pricing, credits, features, content policies, and getting started with 30+ AI models for content generation.');
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

        {/* FAQ Categories */}
        <section className="container mx-auto px-4 py-12 md:py-16">
          <div className="max-w-4xl mx-auto space-y-8">
            {faqCategories.map((category) => (
              <Card key={category.title}>
                <CardHeader>
                  <CardTitle className="text-xl md:text-2xl">{category.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {category.faqs.map((faq, index) => (
                      <AccordionItem key={index} value={`${category.title}-${index}`}>
                        <AccordionTrigger className="text-left">
                          {faq.q}
                        </AccordionTrigger>
                        <AccordionContent>
                          <p className="text-muted-foreground">{faq.a}</p>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Contact CTA */}
        <section className="container mx-auto px-4 py-16 md:py-24">
          <Card className="max-w-2xl mx-auto border-4 border-primary">
            <CardContent className="p-8 md:p-12 text-center">
              <Mail className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h2 className="text-3xl md:text-4xl font-black mb-4">More Questions?</h2>
              <p className="text-lg text-muted-foreground mb-6">
                Contact us at support@artifio.ai
              </p>
              <Button asChild size="lg" variant="neon">
                <a href="mailto:support@artifio.ai">Contact Support</a>
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default FAQ;
