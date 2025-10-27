import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Check, ChevronDown, ChevronUp, X, Trophy } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { OnboardingProgress } from "@/hooks/useOnboarding";

interface OnboardingChecklistProps {
  progress: OnboardingProgress;
  onComplete: () => void;
  onDismiss: () => void;
}

export const OnboardingChecklist = ({ progress, onComplete, onDismiss }: OnboardingChecklistProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const checklistItems = [
    { key: 'viewedTemplates', label: 'View template gallery', completed: progress.checklist.viewedTemplates },
    { key: 'selectedTemplate', label: 'Select a template', completed: progress.checklist.selectedTemplate },
    { key: 'enteredPrompt', label: 'Enter your prompt', completed: progress.checklist.enteredPrompt },
    { key: 'viewedTokenCost', label: 'Review token cost', completed: progress.checklist.viewedTokenCost },
    { key: 'completedFirstGeneration', label: 'Generate your first creation', completed: progress.checklist.completedFirstGeneration },
    { key: 'viewedResult', label: 'View the result', completed: progress.checklist.viewedResult },
    { key: 'downloadedResult', label: 'Download your creation', completed: progress.checklist.downloadedResult },
  ];

  const progressPercentage = (progress.completedCount / progress.totalCount) * 100;
  const allComplete = progress.completedCount === progress.totalCount;

  if (progress.isComplete && progress.bonusAwarded) {
    return null; // Hide completely after completion
  }

  return (
    <Card className="fixed bottom-6 right-6 z-50 shadow-2xl border-2 border-primary-500/20 bg-white">
      {isExpanded ? (
        <div className="w-80">
          <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-gradient-to-r from-primary-50 to-secondary-50">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary-500" />
              <h3 className="font-bold text-lg">Getting Started</h3>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsExpanded(false)}
                className="h-8 w-8"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onDismiss}
                className="h-8 w-8 hover:text-red-500"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-neutral-700">
                  {progress.completedCount} of {progress.totalCount} Complete
                </span>
                <span className="text-primary-500 font-bold">{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>

            <div className="space-y-2">
              {checklistItems.map((item, index) => (
                <div
                  key={item.key}
                  className={cn(
                    "flex items-start gap-3 p-2 rounded-lg transition-all",
                    item.completed && "bg-primary-50"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center h-6 w-6 rounded-full border-2 flex-shrink-0 mt-0.5",
                      item.completed
                        ? "bg-primary-500 border-primary-500 animate-in zoom-in-50 duration-300"
                        : "border-neutral-300 bg-white"
                    )}
                  >
                    {item.completed && <Check className="h-4 w-4 text-white" />}
                  </div>
                  <span
                    className={cn(
                      "text-sm flex-1",
                      item.completed ? "font-semibold text-neutral-900" : "text-neutral-600"
                    )}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            {allComplete && !progress.bonusAwarded && (
              <Button
                onClick={onComplete}
                className="w-full bg-primary-500 hover:bg-primary-600 text-neutral-900 font-bold animate-pulse"
              >
                <Trophy className="h-4 w-4 mr-2" />
                Claim 100 Bonus Tokens
              </Button>
            )}

            {!allComplete && (
              <p className="text-xs text-neutral-500 text-center">
                Complete all steps to earn 100 bonus tokens!
              </p>
            )}
          </div>
        </div>
      ) : (
        <div 
          className="p-4 cursor-pointer hover:bg-neutral-50 transition-colors"
          onClick={() => setIsExpanded(true)}
        >
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12">
              <svg className="transform -rotate-90 h-12 w-12">
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="transparent"
                  className="text-neutral-200"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 20}`}
                  strokeDashoffset={`${2 * Math.PI * 20 * (1 - progressPercentage / 100)}`}
                  className="text-primary-500 transition-all duration-500"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-primary-500">
                  {progress.completedCount}/{progress.totalCount}
                </span>
              </div>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Getting Started</p>
              <p className="text-xs text-neutral-500">{Math.round(progressPercentage)}% complete</p>
            </div>
            <ChevronUp className="h-4 w-4 text-neutral-400" />
          </div>
        </div>
      )}
    </Card>
  );
};
