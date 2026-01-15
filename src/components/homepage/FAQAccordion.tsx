import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How does the credit system work?",
    answer: `Each generation costs credits based on complexity:
    
• Simple image: ~0.5 credits
• Video (5s): ~1 credit
• High-quality image: ~0.75 credits

Your plan includes a monthly credit allocation. Credits never expire while your subscription is active—they accumulate indefinitely.`,
  },
  {
    question: "Can I cancel anytime?",
    answer: "Yes! No contracts, no commitments. Cancel with one click from your dashboard. Your credits are frozen for 30 days — resubscribe within that window and they're fully restored.",
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
    question: "What if I run out of credits?",
    answer: `Three options:

1. Wait until next month (credits refresh with your subscription)
2. Buy additional credits at your current plan rate
3. Upgrade to a higher plan

Subscribers can purchase additional credits anytime. The more you commit, the better your per-credit price.`,
  },
  {
    question: "Is this suitable for beginners?",
    answer: "Absolutely! Our templates require zero AI experience. Just pick one, type what you want, and go. Advanced users can use Custom Mode for full control.",
  },
  {
    question: "Which plan should I choose?",
    answer: `Start with Free (5 credits) to try it. Most creators upgrade to Explorer ($7.99) or Professional ($19.99).

Rule of thumb:
• 1-10 creations/week → Explorer
• 10-50 creations/week → Professional
• 50+ creations/week → Ultimate or Studio`,
  },
  {
    question: "Can I use this for my agency/team?",
    answer: "Yes! Team plans coming soon (5 users, shared credits). For now, you can create separate accounts or contact us for custom enterprise pricing.",
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
          <AccordionTrigger className="text-left font-bold text-lg text-neutral-900 hover:text-secondary-600 hover:no-underline transition-colors">
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
