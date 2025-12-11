import { Mail, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { AnimatedSection } from "./AnimatedSection";

export const ContactSection = () => {
  return (
    <section id="contact" className="py-24 md:py-32 bg-black relative overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5" />

      <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
        <AnimatedSection>
          <p className="text-sm text-white/60 uppercase tracking-widest mb-4">
            Get In Touch
          </p>
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-8">
            Let's Create
            <br />
            Something Amazing
          </h2>
          <p className="text-lg text-white/70 mb-12 max-w-xl mx-auto">
            Ready to bring your vision to life? Reach out and let's discuss your
            next project.
          </p>

          {/* Email */}
          <a
            href="mailto:hello@artifio.ai"
            className="inline-flex items-center gap-3 text-xl md:text-2xl text-white hover:text-white/80 transition-colors mb-12"
          >
            <Mail className="w-6 h-6" />
            hello@artifio.ai
          </a>

          {/* CTA Button */}
          <div className="mt-8">
            <Link
              to="/auth"
              className="group inline-flex items-center gap-3 px-8 py-4 bg-white text-black font-semibold rounded-full hover:bg-white/90 transition-all"
            >
              Start Your Project
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </AnimatedSection>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 py-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-white/40">
            © {new Date().getFullYear()} Artifio. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link to="/privacy" className="text-sm text-white/40 hover:text-white transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="text-sm text-white/40 hover:text-white transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
