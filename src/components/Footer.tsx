import Link from "next/link";
import { Twitter, Linkedin, Youtube, Instagram, Facebook, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";
import { useState } from "react";
import { brand } from '@/config/brand';
import { useNewsletterSubscribe } from "@/hooks/useNewsletterSubscribe";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

export const Footer = () => {
  const [email, setEmail] = useState("");
  const { subscribe, isLoading } = useNewsletterSubscribe();
  const { isPageEnabled } = useFeatureFlags();
  
  const showFeaturesPage = isPageEnabled('features');
  const showBlogPage = isPageEnabled('blog');
  const showCommunityPage = isPageEnabled('community');
  const showTemplateLandings = isPageEnabled('templateLandings');

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await subscribe(email, "footer");
    if (success) {
      setEmail("");
    }
  };

  return (
    <footer className="border-t-4 border-black bg-card mt-20">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-12">
          {/* Brand - full width on mobile */}
          <div className="col-span-2 md:col-span-1 space-y-4 text-center md:text-left">
            <Link href="/" className="flex items-center gap-3 justify-center md:justify-start">
          <img 
            src={logo.src} 
            alt={`${brand.name} logo`}
            className="h-6 md:h-8 object-contain"
              />
              <span className="font-black text-xl md:text-2xl text-foreground">{brand.name}</span>
            </Link>
            <p className="text-sm text-foreground/70 font-medium">
              All-in-one AI content platform for creators
            </p>
            
            {/* Social Media Links - 44x44px tap targets */}
            <div className="flex justify-center md:justify-start gap-2 pt-2">
              <a 
                href={brand.social.twitter}
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 text-foreground/60 hover:text-primary transition-colors rounded-lg hover:bg-muted"
                aria-label="Follow us on X @artifio_ai"
              >
                <Twitter size={28} />
              </a>
              <a 
                href={brand.social.linkedin}
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 text-foreground/60 hover:text-primary transition-colors rounded-lg hover:bg-muted"
                aria-label="Connect on LinkedIn"
              >
                <Linkedin size={28} />
              </a>
              <a 
                href={brand.social.youtube}
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 text-foreground/60 hover:text-primary transition-colors rounded-lg hover:bg-muted"
                aria-label="Subscribe on YouTube"
              >
                <Youtube size={28} />
              </a>
              <a 
                href={brand.social.instagram}
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 text-foreground/60 hover:text-primary transition-colors rounded-lg hover:bg-muted"
                aria-label="Follow us on Instagram"
              >
                <Instagram size={28} />
              </a>
              <a 
                href={brand.social.facebook}
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 text-foreground/60 hover:text-primary transition-colors rounded-lg hover:bg-muted"
                aria-label="Follow us on Facebook"
              >
                <Facebook size={28} />
              </a>
            </div>
          </div>

          {/* Product */}
          <div className="text-center md:text-left">
            <h3 className="font-black text-sm mb-4">PRODUCT</h3>
            <ul className="space-y-4">
              {showFeaturesPage && (
                <li>
                  <Link href="/features" className="text-sm text-foreground/70 hover:text-primary hover:underline font-medium transition-all">
                    Features
                  </Link>
                </li>
              )}
              <li>
                <Link href="/pricing" className="text-sm text-foreground/70 hover:text-primary hover:underline font-medium transition-all">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/auth" className="text-sm text-foreground/70 hover:text-primary hover:underline font-medium transition-all">
                  Sign Up
                </Link>
              </li>
            </ul>
          </div>

          {/* Popular Templates - conditionally rendered */}
          {showTemplateLandings && (
            <div className="text-center md:text-left">
              <h3 className="font-black text-sm mb-4">POPULAR TEMPLATES</h3>
              <ul className="space-y-4">
                <li>
                  <Link href="/templates/photo-editing/professional-headshot" className="text-sm text-foreground/70 hover:text-primary hover:underline font-medium transition-all">
                    Professional Headshots
                  </Link>
                </li>
                <li>
                  <Link href="/templates/ai-image/product-photography" className="text-sm text-foreground/70 hover:text-primary hover:underline font-medium transition-all">
                    Product Photography
                  </Link>
                </li>
                <li>
                  <Link href="/templates/text-to-image/social-media-content" className="text-sm text-foreground/70 hover:text-primary hover:underline font-medium transition-all">
                    Social Media Content
                  </Link>
                </li>
              </ul>
            </div>
          )}

          {/* Company */}
          <div className="text-center md:text-left">
            <h3 className="font-black text-sm mb-4">COMPANY</h3>
            <ul className="space-y-4">
              <li>
                <Link href="/about" className="text-sm text-foreground/70 hover:text-primary hover:underline font-medium transition-all">
                  About
                </Link>
              </li>
              {showBlogPage && (
                <li>
                  <Link href="/blog" className="text-sm text-foreground/70 hover:text-primary hover:underline font-medium transition-all">
                    Blog
                  </Link>
                </li>
              )}
              <li>
                <Link href="/privacy" className="text-sm text-foreground/70 hover:text-primary hover:underline font-medium transition-all">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-foreground/70 hover:text-primary hover:underline font-medium transition-all">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="text-center md:text-left">
            <h3 className="font-black text-sm mb-4">SUPPORT</h3>
            <ul className="space-y-4">
              <li>
                <Link href="/faq" className="text-sm text-foreground/70 hover:text-primary hover:underline font-medium transition-all">
                  FAQ
                </Link>
              </li>
              {showCommunityPage && (
                <li>
                  <Link href="/community" className="text-sm text-foreground/70 hover:text-primary hover:underline font-medium transition-all">
                    Community
                  </Link>
                </li>
              )}
              <li>
                <a href={`mailto:${brand.supportEmail}`} className="text-sm text-foreground/70 hover:text-primary hover:underline font-medium transition-all">
                  Contact Support
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Newsletter Signup */}
        <div className="mt-16 pt-12 border-t-3 border-black">
          <div className="max-w-md mx-auto text-center">
            <h3 className="font-black text-sm mb-2">STAY UPDATED</h3>
            <p className="text-sm text-foreground/70 mb-4">Get AI tips & product updates</p>
            <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
              <Input 
                type="email" 
                placeholder="Enter your email" 
                className="flex-1"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button type="submit" disabled={isLoading} className="bg-primary hover:bg-primary/90">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {isLoading ? "..." : "Subscribe"}
              </Button>
            </form>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t-3 border-black mt-16 pt-12 text-center">
          <p className="text-sm text-foreground/70 font-medium">
            © {new Date().getFullYear()} <span className="font-bold">{brand.name}</span>. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};