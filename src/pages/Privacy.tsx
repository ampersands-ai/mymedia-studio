import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useEffect } from "react";

const Privacy = () => {
  useEffect(() => {
    document.title = "Privacy Policy - Artifio.ai";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Privacy Policy for Artifio.ai - Learn how we collect, use, and protect your personal information.');
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      
      {/* Header */}
      <header className="border-b-4 border-black bg-card relative z-10">
        <nav className="container mx-auto px-4 py-3 md:py-4" aria-label="Main navigation">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 md:gap-3 hover:opacity-80 transition-opacity">
              <div className="h-8 w-8 md:h-10 md:w-10 rounded-xl bg-gradient-primary border-3 border-black brutal-shadow flex items-center justify-center">
                <Sparkles className="h-5 w-5 md:h-6 md:w-6 text-white" aria-hidden="true" />
              </div>
              <h1 className="text-xl md:text-3xl font-black gradient-text">ARTIFIO.AI</h1>
            </Link>
            <div className="flex items-center gap-2 md:gap-3">
              <Button variant="ghost" onClick={() => window.location.href = "/pricing"} className="text-sm md:text-base px-2 md:px-4">
                Pricing
              </Button>
              <Button variant="default" onClick={() => window.location.href = "/auth"} className="text-sm md:text-base">
                Sign In
              </Button>
            </div>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 py-12 max-w-4xl">
        <article className="brutal-card bg-card p-8 md:p-12">
          <header className="mb-8">
            <h1 className="text-4xl md:text-5xl font-black mb-4">PRIVACY POLICY</h1>
            <p className="text-foreground/60 font-medium">Last Updated: October 4, 2025</p>
          </header>

          <div className="space-y-8 text-foreground/80 font-medium">
            <section>
              <h2 className="text-2xl font-black mb-4 text-foreground">1. Introduction</h2>
              <p className="leading-relaxed">
                Welcome to Artifio.ai ("we," "our," or "us"). We respect your privacy and are committed to protecting your personal data. This privacy policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered creative platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black mb-4 text-foreground">2. Information We Collect</h2>
              <h3 className="text-xl font-bold mb-3 text-foreground">Personal Information</h3>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>Email address and full name when you create an account</li>
                <li>Authentication data (password or OAuth tokens from Google/Apple)</li>
                <li>Profile information you choose to provide</li>
              </ul>
              
              <h3 className="text-xl font-bold mb-3 mt-4 text-foreground">Usage Information</h3>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>Content you generate (prompts, AI-generated outputs)</li>
                <li>Token usage and subscription information</li>
                <li>Device information and IP address</li>
                <li>Analytics data (pages visited, features used)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-black mb-4 text-foreground">3. How We Use Your Information</h2>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>To provide and maintain our AI generation services</li>
                <li>To process your requests and generate content</li>
                <li>To manage your account and subscription</li>
                <li>To send you updates, security alerts, and support messages</li>
                <li>To improve our services and develop new features</li>
                <li>To detect and prevent fraud or abuse</li>
                <li>To comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-black mb-4 text-foreground">4. Data Sharing and Disclosure</h2>
              <p className="leading-relaxed mb-3">
                We do not sell your personal information. We may share your data with:
              </p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li><strong>Service Providers:</strong> Cloud hosting, AI processing, payment processing, and analytics services</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-black mb-4 text-foreground">5. AI-Generated Content</h2>
              <p className="leading-relaxed">
                Content you generate using our AI services may be processed by third-party AI providers. We use industry-standard security measures to protect your prompts and generated content. Your creative outputs belong to you, subject to our Terms of Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black mb-4 text-foreground">6. Data Security</h2>
              <p className="leading-relaxed">
                We implement appropriate technical and organizational security measures to protect your personal data, including encryption, access controls, and secure data storage. However, no method of transmission over the Internet is 100% secure.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black mb-4 text-foreground">7. Your Rights</h2>
              <p className="leading-relaxed mb-3">You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>Access your personal data</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Object to or restrict processing</li>
                <li>Data portability</li>
                <li>Withdraw consent at any time</li>
              </ul>
              <p className="leading-relaxed mt-3">
                To exercise these rights, please contact us at privacy@artifio.ai
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black mb-4 text-foreground">8. Cookies and Tracking</h2>
              <p className="leading-relaxed">
                We use cookies and similar tracking technologies to maintain your session, remember your preferences, and analyze how you use our service. You can control cookies through your browser settings.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black mb-4 text-foreground">9. Children's Privacy</h2>
              <p className="leading-relaxed">
                Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you believe we have collected such information, please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black mb-4 text-foreground">10. International Data Transfers</h2>
              <p className="leading-relaxed">
                Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place to protect your data in accordance with this privacy policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black mb-4 text-foreground">11. Changes to This Policy</h2>
              <p className="leading-relaxed">
                We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last Updated" date. Continued use of our service after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black mb-4 text-foreground">12. Contact Us</h2>
              <p className="leading-relaxed">
                If you have questions about this privacy policy or our privacy practices, please contact us at:
              </p>
              <div className="mt-4 p-4 bg-muted rounded-lg border-3 border-black">
                <p className="font-bold">Email: privacy@artifio.ai</p>
                <p className="font-bold mt-2">Address: [Your Business Address]</p>
              </div>
            </section>
          </div>
        </article>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t-4 border-black bg-card mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-foreground/60 font-medium text-center md:text-left">
              © 2025 ARTIFIO.AI. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link to="/privacy" className="text-foreground/60 hover:text-foreground font-bold transition-colors">
                Privacy
              </Link>
              <Link to="/terms" className="text-foreground/60 hover:text-foreground font-bold transition-colors">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Privacy;
