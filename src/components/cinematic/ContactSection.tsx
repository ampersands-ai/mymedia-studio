import { AnimatedSection } from "./AnimatedSection";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";

export const ContactSection = () => {
  return (
    <section id="contact" className="py-24 md:py-32 bg-black relative overflow-hidden">
      {/* Red Gradient Accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-red-600/20 rounded-full blur-[150px] pointer-events-none" />
      
      <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
        <AnimatedSection>
          <span className="text-sm font-medium uppercase tracking-widest text-red-600 mb-4 block">
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
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-16">
            <Link
              to="/auth"
              className="px-10 py-5 bg-red-600 text-white font-bold uppercase tracking-wide hover:bg-red-700 transition-colors text-lg"
            >
              Start Creating Free
            </Link>
            <a
              href="mailto:hello@artifio.ai"
              className="flex items-center gap-2 px-10 py-5 border border-white/30 text-white font-medium uppercase tracking-wide hover:bg-white/10 transition-colors"
            >
              <Mail className="w-5 h-5" />
              Contact Us
            </a>
          </div>
        </AnimatedSection>

        {/* Footer */}
        <AnimatedSection delay={400}>
          <div className="pt-16 border-t border-white/10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <img 
                  src="/logos/artifio.png" 
                  alt="Artifio" 
                  className="h-6 w-auto opacity-60"
                />
                <span className="text-white/40 text-sm">
                  © 2025 ARTIFIO.AI. All rights reserved.
                </span>
              </div>
              <div className="flex items-center gap-8">
                <a 
                  href="https://x.com/artifio_ai" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-white/40 hover:text-white text-sm uppercase tracking-wide transition-colors"
                >
                  X / Twitter
                </a>
                <a 
                  href="https://linkedin.com/company/artifio" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-white/40 hover:text-white text-sm uppercase tracking-wide transition-colors"
                >
                  LinkedIn
                </a>
                <Link 
                  to="/privacy"
                  className="text-white/40 hover:text-white text-sm uppercase tracking-wide transition-colors"
                >
                  Privacy
                </Link>
              </div>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
};
