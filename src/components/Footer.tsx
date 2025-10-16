import { Link } from "react-router-dom";
import { Twitter, Linkedin, Youtube, MessageSquare } from "lucide-react";
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
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="space-y-4 text-center md:text-left">
            <Link to="/" className="flex items-center gap-3 justify-center md:justify-start">
              <img 
                src={logo} 
                alt="artifio.ai logo" 
                className="h-12 md:h-16 object-contain"
              />
              <span className="font-black text-xl md:text-2xl text-foreground">artifio.ai</span>
            </Link>
            <p className="text-sm text-foreground/70 font-medium">
              All-in-one AI content platform for creators
            </p>
            
            {/* Social Media Links */}
            <div className="flex justify-center md:justify-start gap-4 pt-2">
              <a 
                href="https://twitter.com/artifio" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-foreground/60 hover:text-primary transition-colors"
                aria-label="Twitter"
              >
                <Twitter size={24} />
              </a>
              <a 
                href="https://linkedin.com/company/artifio" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-foreground/60 hover:text-primary transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin size={24} />
              </a>
              <a 
                href="https://youtube.com/@artifio" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-foreground/60 hover:text-primary transition-colors"
                aria-label="YouTube"
              >
                <Youtube size={24} />
              </a>
              <a 
                href="https://discord.gg/artifio" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-foreground/60 hover:text-primary transition-colors"
                aria-label="Discord"
              >
                <MessageSquare size={24} />
              </a>
            </div>
          </div>

          {/* Product */}
          <div className="text-center md:text-left">
            <h3 className="font-black text-sm mb-4">PRODUCT</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/create" className="text-sm text-foreground/70 hover:text-primary hover:underline font-medium transition-all">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/create" className="text-sm text-foreground/70 hover:text-primary hover:underline font-medium transition-all">
                  Templates
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

          {/* Company */}
          <div className="text-center md:text-left">
            <h3 className="font-black text-sm mb-4">COMPANY</h3>
            <ul className="space-y-3">
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
            <ul className="space-y-3">
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
        <div className="mt-12 pt-8 border-t-3 border-black">
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
        <div className="border-t-3 border-black mt-12 pt-8 text-center">
          <p className="text-sm text-foreground/70 font-medium">
            © {new Date().getFullYear()} <span className="font-bold">artifio.ai</span>. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};