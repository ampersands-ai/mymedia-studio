import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";

interface Testimonial {
  quote: string;
  author: string;
  handle: string;
  role: string;
  avatar?: string;
}

const testimonials: Testimonial[] = [
  {
    quote: `I was spending $100/month on AI tools I could barely afford. ${brand.name} gives me everything I need for $8. I've created 200+ videos in the last month alone.`,
    author: "Maria Santos",
    handle: "@mariacreates",
    role: "Content Creator, Philippines",
  },
  {
    quote: `Used to take me 3 hours to create a week's worth of content. Now it takes 30 minutes with ${brand.name} templates. Game changer for my productivity.`,
    author: "Jake Martinez",
    handle: "@jakemakes",
    role: "YouTuber, 75K subscribers",
  },
  {
    quote: `I thought cheap = bad quality. I was wrong. My Instagram engagement is up 40% since using ${brand.name}. My followers can't tell it's AI.`,
    author: "Priya Sharma",
    handle: "@priyasocial",
    role: "Social Media Manager, India",
  },
  {
    quote: `I run a small agency. We need videos, images, and audio. ${brand.name} replaced 5 different subscriptions. Saved us $500/month.`,
    author: "Alex Chen",
    handle: "@alexagency",
    role: "Agency Owner, Singapore",
  },
];

export const TestimonialCarousel = () => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const next = () => setCurrent((prev) => (prev + 1) % testimonials.length);
  const prev = () => setCurrent((prev) => (prev - 1 + testimonials.length) % testimonials.length);

  return (
    <div className="relative max-w-4xl mx-auto">
      <div className="brutalist-card p-8 md:p-12">
        <div className="space-y-6">
          <div className="flex gap-1 text-primary-500 text-2xl">
            {[...Array(5)].map((_, i) => (
              <span key={i}>⭐</span>
            ))}
          </div>
          <blockquote className="text-xl md:text-2xl font-medium text-neutral-900 leading-relaxed">
            "{testimonials[current].quote}"
          </blockquote>
          <div className="space-y-2">
            <div className="font-black text-lg text-neutral-900">
              {testimonials[current].author}
            </div>
            <div className="text-neutral-600">
              {testimonials[current].handle}
            </div>
            <div className="text-sm text-neutral-500">
              {testimonials[current].role}
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-center gap-4 mt-6">
        <Button
          variant="outline"
          size="icon"
          onClick={prev}
          aria-label="Previous testimonial"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        
        <div className="flex items-center gap-2">
          {testimonials.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrent(idx)}
              className={`w-3 h-3 rounded-full border-2 border-black transition-all ${
                idx === current ? "bg-primary-500" : "bg-background"
              }`}
              aria-label={`Go to testimonial ${idx + 1}`}
            />
          ))}
        </div>
        
        <Button
          variant="outline"
          size="icon"
          onClick={next}
          aria-label="Next testimonial"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};
