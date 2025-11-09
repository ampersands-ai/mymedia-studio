import { useEffect, useRef } from 'react';
import { FlowStep } from '@/types/admin/model-health';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';

export const useFlowStepNotifications = (
  flowSteps: FlowStep[],
  modelName: string,
  enabled: boolean = true
) => {
  const notifiedStepsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!enabled) return;

    flowSteps.forEach((step) => {
      // Skip if already notified
      if (notifiedStepsRef.current.has(step.step_number)) return;

      // Major milestones to notify about
      const majorSteps = [
        'Credit Check',
        'Credits Deducted',
        'API Request Sent',
        'First Response Received',
        'Final Response Received',
        'Media Stored',
        'Media Delivered',
        'Credits Refunded'
      ];

      const isMajorStep = majorSteps.some(name => 
        step.step_name.toLowerCase().includes(name.toLowerCase())
      );

      if (!isMajorStep) return;

      // Notify based on status
      if (step.status === 'completed') {
        notifiedStepsRef.current.add(step.step_number);
        
        toast.success(step.step_name, {
          description: `${modelName} • ${step.duration_ms}ms`,
          duration: 2000,
        });
      } else if (step.status === 'failed') {
        notifiedStepsRef.current.add(step.step_number);
        
        toast.error(`${step.step_name} Failed`, {
          description: step.error || `${modelName} test failed`,
          duration: 5000,
        });
      } else if (step.status === 'running') {
        // Only notify once when step starts running
        if (!notifiedStepsRef.current.has(step.step_number)) {
          notifiedStepsRef.current.add(step.step_number);
          
          toast.loading(step.step_name, {
            description: `${modelName} in progress...`,
            duration: Infinity,
            id: `step-${step.step_number}`,
          });
        }
      }
    });
  }, [flowSteps, modelName, enabled]);

  // Cleanup function to dismiss loading toasts
  const cleanup = () => {
    notifiedStepsRef.current.clear();
  };

  return { cleanup };
};
