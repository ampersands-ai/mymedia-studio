import { Link } from "react-router-dom";
import { Twitter, Linkedin, Youtube, Instagram, Facebook } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";

export const Footer = () => {
  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Integrate with email service (Mailchimp/ConvertKit/Loops)
    console.log("Newsletter signup");
  };

  return (
    <footer className="border-t-4 border-black bg-card mt-20">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12">
          {/* Brand */}
          <div className="space-y-4 text-center md:text-left">
            <Link to="/" className="flex items-center gap-3 justify-center md:justify-start">
          <img 
            src={logo} 
            alt="artifio.ai logo" 
            className="h-6 md:h-8 object-contain"
              />
              <span className="font-black text-xl md:text-2xl text-foreground">artifio.ai</span>
            </Link>
            <p className="text-sm text-foreground/70 font-medium">
              All-in-one AI content platform for creators
            </p>
            
            {/* Social Media Links - 44x44px tap targets */}
            <div className="flex justify-center md:justify-start gap-2 pt-2">
              <a 
                href="https://x.com/artifio_ai" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 text-foreground/60 hover:text-primary transition-colors rounded-lg hover:bg-muted"
                aria-label="Follow us on X @artifio_ai"
              >
                <Twitter size={28} />
              </a>
              <a 
                href="https://linkedin.com/company/artifio" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 text-foreground/60 hover:text-primary transition-colors rounded-lg hover:bg-muted"
                aria-label="Connect on LinkedIn"
              >
                <Linkedin size={28} />
              </a>
              <a 
                href="https://youtube.com/@artifio" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 text-foreground/60 hover:text-primary transition-colors rounded-lg hover:bg-muted"
                aria-label="Subscribe on YouTube"
              >
                <Youtube size={28} />
              </a>
              <a 
                href="https://www.instagram.com/artifio.ai" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 text-foreground/60 hover:text-primary transition-colors rounded-lg hover:bg-muted"
                aria-label="Follow us on Instagram"
              >
                <Instagram size={28} />
              </a>
              <a 
                href="https://www.facebook.com/share/1F1J8UFCgr/" 
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
              <li>
                <Link to="/features" className="text-sm text-foreground/70 hover:text-primary hover:underline font-medium transition-all">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/dashboard/templates" className="text-sm text-foreground/70 hover:text-primary hover:underline font-medium transition-all">
                  Workflow Templates
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-sm text-foreground/70 hover:text-primary hover:underline font-medium transition-all">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/auth" className="text-sm text-foreground/70 hover:text-primary hover:underline font-medium transition-all">
                  Sign Up
                </Link>
              </li>
            </ul>
          </div>

          {/* Popular Templates */}
          <div className="text-center md:text-left">
            <h3 className="font-black text-sm mb-4">POPULAR TEMPLATES</h3>
            <ul className="space-y-4">
              <li>
                <Link to="/templates/photo-editing/professional-headshot" className="text-sm text-foreground/70 hover:text-primary hover:underline font-medium transition-all">
                  Professional Headshots
                </Link>
              </li>
              <li>
                <Link to="/templates/ai-image/product-photography" className="text-sm text-foreground/70 hover:text-primary hover:underline font-medium transition-all">
                  Product Photography
                </Link>
              </li>
              <li>
                <Link to="/templates/text-to-image/social-media-content" className="text-sm text-foreground/70 hover:text-primary hover:underline font-medium transition-all">
                  Social Media Content
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div className="text-center md:text-left">
            <h3 className="font-black text-sm mb-4">COMPANY</h3>
            <ul className="space-y-4">
              <li>
                <Link to="/about" className="text-sm text-foreground/70 hover:text-primary hover:underline font-medium transition-all">
                  About
                </Link>
              </li>
              <li>
                <Link to="/blog" className="text-sm text-foreground/70 hover:text-primary hover:underline font-medium transition-all">
                  Blog
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-sm text-foreground/70 hover:text-primary hover:underline font-medium transition-all">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-sm text-foreground/70 hover:text-primary hover:underline font-medium transition-all">
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
                <Link to="/faq" className="text-sm text-foreground/70 hover:text-primary hover:underline font-medium transition-all">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/community" className="text-sm text-foreground/70 hover:text-primary hover:underline font-medium transition-all">
                  Community
                </Link>
              </li>
              <li>
                <a href="mailto:support@artifio.ai" className="text-sm text-foreground/70 hover:text-primary hover:underline font-medium transition-all">
                  Contact Us
                </a>
              </li>
              <li>
                <a href="mailto:help@artifio.ai" className="text-sm text-foreground/70 hover:text-primary hover:underline font-medium transition-all">
                  Help Center
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
                required
              />
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                Subscribe
              </Button>
            </form>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t-3 border-black mt-16 pt-12 text-center">
          <p className="text-sm text-foreground/70 font-medium">
            © {new Date().getFullYear()} <span className="font-bold">artifio.ai</span>. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};