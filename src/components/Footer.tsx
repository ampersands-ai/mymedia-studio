import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

export const Footer = () => {
  return (
    <footer className="border-t-4 border-black bg-card mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-3">
              <img 
                src={logo} 
                alt="artifio.ai logo" 
                className="h-16 object-contain"
              />
            </Link>
            <p className="text-sm text-foreground/70 font-medium">
              Professional AI content creation at student-friendly prices.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-black text-sm mb-4">PRODUCT</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/pricing" className="text-sm text-foreground/70 hover:text-foreground font-medium transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/auth" className="text-sm text-foreground/70 hover:text-foreground font-medium transition-colors">
                  Sign Up
                </Link>
              </li>
              <li>
                <Link to="/auth" className="text-sm text-foreground/70 hover:text-foreground font-medium transition-colors">
                  Sign In
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-black text-sm mb-4">COMPANY</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/privacy" className="text-sm text-foreground/70 hover:text-foreground font-medium transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-sm text-foreground/70 hover:text-foreground font-medium transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-black text-sm mb-4">SUPPORT</h3>
            <ul className="space-y-2">
              <li>
                <a href="mailto:support@artifio.ai" className="text-sm text-foreground/70 hover:text-foreground font-medium transition-colors">
                  Contact Us
                </a>
              </li>
              <li>
                <a href="mailto:help@artifio.ai" className="text-sm text-foreground/70 hover:text-foreground font-medium transition-colors">
                  Help Center
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t-3 border-black mt-8 pt-8 text-center">
          <p className="text-sm text-foreground/70 font-medium">
            © {new Date().getFullYear()} <span className="font-bold">artifio.ai</span>. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};