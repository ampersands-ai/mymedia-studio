import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How does the token system work?",
    answer: `Each generation costs tokens based on complexity:
    
• Simple image: ~50 tokens
• Video (5s): ~100 tokens
• High-quality image: ~75 tokens

Your plan includes a monthly token allocation. Unused tokens roll over to next month.`,
  },
  {
    question: "Can I cancel anytime?",
    answer: "Yes! No contracts, no commitments. Cancel with one click from your dashboard. Keep your tokens until they expire (12 months).",
  },
  {
    question: "What's the quality like compared to Midjourney/Runway?",
    answer: `We give you access to the SAME models (Midjourney, Runway, etc.) Plus 20+ other options.

Quality = identical to using those tools directly. Benefit = You get them all in one place at 1/5th the cost.`,
  },
  {
    question: "Do I own the content I create?",
    answer: "Yes! You have full commercial rights to everything you generate. Use it for client work, sell it, post it anywhere. (Subject to individual AI model terms, which we comply with)",
  },
  {
    question: "What if I run out of tokens?",
    answer: `Three options:

1. Wait until next month (resets automatically)
2. Buy token top-up ($5 for 1,000 tokens)
3. Upgrade to higher plan

You'll get alerts at 80% and 95% usage.`,
  },
  {
    question: "Is this suitable for beginners?",
    answer: "Absolutely! Our templates require zero AI experience. Just pick one, type what you want, and go. Advanced users can use Custom Mode for full control.",
  },
  {
    question: "Which plan should I choose?",
    answer: `Start with Free (500 tokens) to try it. Most creators upgrade to Explorer ($7.99) or Professional ($19.99).

Rule of thumb:
• 1-10 creations/week → Explorer
• 10-50 creations/week → Professional
• 50+ creations/week → Ultimate`,
  },
  {
    question: "Can I use this for my agency/team?",
    answer: "Yes! Team plans coming soon (5 users, shared tokens). For now, you can create separate accounts or contact us for custom enterprise pricing.",
  },
];

export const FAQAccordion = () => {
  return (
    <Accordion type="single" collapsible className="space-y-4">
      {faqs.map((faq, idx) => (
        <AccordionItem
          key={idx}
          value={`item-${idx}`}
          className="brutalist-card px-6 py-2"
        >
          <AccordionTrigger className="text-left font-bold text-lg text-navy hover:text-secondary-600 hover:no-underline transition-colors">
            {faq.question}
          </AccordionTrigger>
          <AccordionContent className="text-neutral-600 whitespace-pre-line">
            {faq.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
};
