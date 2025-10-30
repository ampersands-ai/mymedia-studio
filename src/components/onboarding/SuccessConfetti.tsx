import { useEffect } from "react";
import { useConfetti } from "@/hooks/useConfetti";
import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

interface SuccessConfettiProps {
  trigger: boolean;
  onComplete?: () => void;
  message?: string;
}

export const SuccessConfetti = ({ 
  trigger, 
  onComplete,
  message = "🎉 Amazing! Your first creation is ready!" 
}: SuccessConfettiProps) => {
  const { fireCelebration } = useConfetti();

  useEffect(() => {
    if (trigger) {
      fireCelebration();
      
      const timer = setTimeout(() => {
        onComplete?.();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [trigger, onComplete, fireCelebration]);

  if (!trigger) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center pointer-events-none animate-in fade-in duration-300">
      <Card className="p-8 max-w-md mx-4 pointer-events-auto shadow-2xl border-4 border-primary-500 bg-white animate-in zoom-in-50 duration-500">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-primary-500 rounded-full p-4 animate-bounce">
              <Sparkles className="h-12 w-12 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-neutral-900">{message}</h2>
          <p className="text-neutral-600">
            Keep going to complete your onboarding checklist and earn 2 bonus credits!
          </p>
        </div>
      </Card>
    </div>
  );
};
