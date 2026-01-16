import { AnimatedSection } from "./AnimatedSection";
import { Link } from "react-router-dom";
import { Mail, Twitter, Linkedin, Youtube, Instagram, Facebook, Loader2 } from "lucide-react";
import { useState } from "react";
import { useNewsletterSubscribe } from "@/hooks/useNewsletterSubscribe";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

const footerLinks = {
  product: [
    { label: "Features", href: "/features" },
    { label: "Workflow Templates", href: "/templates" },
    { label: "Pricing", href: "/pricing" },
    { label: "Sign Up", href: "/auth" },
  ],
  templates: [
    { label: "Professional Headshots", href: "/templates/professional-headshots" },
    { label: "Product Photography", href: "/templates/product-photography" },
    { label: "Social Media Content", href: "/templates/social-media-content" },
  ],
  company: [
    { label: "About", href: "/about" },
    { label: "Blog", href: "/blog" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
  ],
  support: [
    { label: "FAQ", href: "/faq" },
    { label: "Community", href: "/community" },
    { label: "Contact Us", href: "mailto:support@artifio.ai" },
    { label: "Help Center", href: "/help" },
  ],
};

const socialLinks = [
  { icon: Twitter, href: "https://x.com/artifio_ai", label: "Twitter" },
  { icon: Linkedin, href: "https://linkedin.com/company/artifio", label: "LinkedIn" },
  { icon: Youtube, href: "https://youtube.com/@artifio", label: "YouTube" },
  { icon: Instagram, href: "https://instagram.com/artifio_ai", label: "Instagram" },
  { icon: Facebook, href: "https://facebook.com/artifio", label: "Facebook" },
];

export const ContactSection = () => {
  const [email, setEmail] = useState("");
  const { subscribe, isLoading } = useNewsletterSubscribe();
  const { isPageEnabled } = useFeatureFlags();

  const showFeaturesPage = isPageEnabled("features");
  const showBlogPage = isPageEnabled("blog");
  const showCommunityPage = isPageEnabled("community");
  const showTemplateLandings = isPageEnabled("templateLandings");

  const productLinks = footerLinks.product.filter((link) => {
    if (link.label === "Features") return showFeaturesPage;
    if (link.label === "Workflow Templates") return showTemplateLandings;
    return true;
  });

  const companyLinks = footerLinks.company.filter((link) =>
    link.label === "Blog" ? showBlogPage : true
  );

  const supportLinks = footerLinks.support.filter((link) =>
    link.label === "Community" ? showCommunityPage : true
  );

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await subscribe(email, "homepage-footer");
    if (success) {
      setEmail("");
    }
  };

  return (
    <section id="contact" className="bg-black">
      {/* CTA Section */}
      <div className="py-24 md:py-32 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary-orange/20 rounded-full blur-[150px] pointer-events-none" />
        
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <AnimatedSection>
            <span className="text-sm font-medium uppercase tracking-widest text-primary-orange mb-4 block">
              Get Started
            </span>
            <h2 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tight mb-8">
              Ready to Create?
            </h2>
            <p className="text-xl text-white/60 mb-12 max-w-2xl mx-auto">
              Join thousands of creators using AI to bring their ideas to life. 
              Start free, no credit card required.
            </p>
          </AnimatedSection>

          <AnimatedSection delay={200}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link
                to="/auth"
                className="px-10 py-5 bg-gradient-to-r from-primary-yellow to-primary-orange text-foreground font-bold uppercase tracking-wide hover:shadow-lg hover:shadow-primary-orange/30 transition-all text-lg rounded-2xl"
              >
                Start Creating Free
              </Link>
              <a
                href="mailto:support@artifio.ai"
                className="flex items-center gap-2 px-10 py-5 border border-white/30 text-white font-medium uppercase tracking-wide hover:bg-white/10 transition-colors rounded-2xl"
              >
                <Mail className="w-5 h-5" />
                Contact Us
              </a>
            </div>
          </AnimatedSection>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-12 md:py-16">
          {/* Mobile: Brand + 2-col grid for links. Desktop: flex row */}
          <div className="flex flex-col lg:flex-row lg:flex-wrap lg:justify-center gap-8 lg:gap-16 mb-8 md:mb-12">
            {/* Brand Column */}
            <div className="w-full lg:w-auto lg:max-w-[280px] flex-shrink">
              <Link to="/" className="flex items-center gap-2 mb-3">
                <img 
                  src="/logos/artifio.png" 
                  alt="Artifio" 
                  className="h-7 w-auto"
                />
                <span className="text-lg font-bold text-white">artifio.ai</span>
              </Link>
              <p className="text-sm text-white/50 mb-4 leading-relaxed">
                AI-powered content creation platform for creators and businesses.
              </p>
              <div className="flex items-center gap-2">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:bg-primary-orange hover:text-white transition-all"
                    aria-label={social.label}
                  >
                    <social.icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>

            {/* Link columns - 2-col grid on mobile, inline on desktop */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-wrap gap-6 lg:gap-16">
              {/* Product */}
              <div className="min-w-[120px]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary-orange mb-3">
                  Product
                </h4>
                <ul className="space-y-2">
                  {productLinks.map((link) => (
                    <li key={link.label}>
                      <Link 
                        to={link.href}
                        className="text-sm text-white/70 hover:text-white transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {showTemplateLandings && (
                <div className="min-w-[120px]">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary-orange mb-3">
                    Templates
                  </h4>
                  <ul className="space-y-2">
                    {footerLinks.templates.map((link) => (
                      <li key={link.label}>
                        <Link 
                          to={link.href}
                          className="text-sm text-white/70 hover:text-white transition-colors"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Company */}
              <div className="min-w-[120px]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary-orange mb-3">
                  Company
                </h4>
                <ul className="space-y-2">
                  {companyLinks.map((link) => (
                    <li key={link.label}>
                      <Link 
                        to={link.href}
                        className="text-sm text-white/70 hover:text-white transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Support */}
              <div className="min-w-[120px]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary-orange mb-3">
                  Support
                </h4>
                <ul className="space-y-2">
                  {supportLinks.map((link) => (
                    <li key={link.label}>
                      {link.href.startsWith("mailto:") ? (
                        <a 
                          href={link.href}
                          className="text-sm text-white/70 hover:text-white transition-colors"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link 
                          to={link.href}
                          className="text-sm text-white/70 hover:text-white transition-colors"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Newsletter */}
          <div className="border-t border-white/10 pt-8 mb-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-primary-orange mb-2">
                  Stay Updated
                </h4>
                <p className="text-sm text-white/50">
                  Get the latest AI features and updates delivered to your inbox.
                </p>
              </div>
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="px-4 py-3 bg-white/10 border border-white/20 text-white placeholder:text-white/40 text-sm w-full sm:flex-1 md:w-64 focus:outline-none focus:border-primary-orange rounded-2xl"
                  required
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-3 bg-gradient-to-r from-primary-yellow to-primary-orange text-foreground font-bold text-sm uppercase tracking-wide hover:shadow-lg hover:shadow-primary-orange/30 transition-all whitespace-nowrap rounded-2xl disabled:opacity-50 flex items-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {isLoading ? "Subscribing..." : "Subscribe"}
                </button>
              </form>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t border-white/10 pt-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-sm text-white/40">
                © 2025 artifio.ai. All rights reserved.
              </p>
              <div className="flex items-center gap-6">
                <Link 
                  to="/privacy"
                  className="text-sm text-white/40 hover:text-white transition-colors"
                >
                  Privacy Policy
                </Link>
                <Link 
                  to="/terms"
                  className="text-sm text-white/40 hover:text-white transition-colors"
                >
                  Terms of Service
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
