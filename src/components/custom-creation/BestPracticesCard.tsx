import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

/**
 * Static best practices display
 */
export const BestPracticesCard: React.FC = () => {
  return (
    <Card className="bg-card border border-gray-200 shadow-sm rounded-xl">
      <div className="p-4 md:p-6">
        <h3 className="text-lg md:text-xl font-black mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          BEST PRACTICES
        </h3>
        <div className="grid md:grid-cols-2 gap-3 md:gap-4 text-sm">
          <div className="flex gap-3">
            <span className="font-bold text-black dark:text-white">01</span>
            <p>Be specific and descriptive in your prompts for better results</p>
          </div>
          <div className="flex gap-3">
            <span className="font-bold text-black dark:text-white">02</span>
            <p>Use the "Enhance" feature to automatically improve your prompts</p>
          </div>
          <div className="flex gap-3">
            <span className="font-bold text-black dark:text-white">03</span>
            <p>Upload reference images to guide the AI's creative direction</p>
          </div>
          <div className="flex gap-3">
            <span className="font-bold text-black dark:text-white">04</span>
            <p>Experiment with different models to find your perfect style</p>
          </div>
        </div>
      </div>
    </Card>
  );
};
