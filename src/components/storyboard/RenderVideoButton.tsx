/**
 * Render Video Button Component
 * Button with cost breakdown and confirmation dialog
 */

import { Play, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { NotifyOnCompletionToggle } from '@/components/shared/NotifyOnCompletionToggle';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface RenderVideoButtonProps {
  isRendering: boolean;
  tokenBalance: number;
  actualRenderCost: number;
  initialEstimate: number;
  costDifference: number;
  estimatedDuration: number;
  sceneCount: number;
  notifyOnCompletion: boolean;
  onNotifyOnCompletionChange: (notify: boolean) => void;
  onRender: () => void;
  disabled: boolean;
}

export const RenderVideoButton = ({
  isRendering,
  tokenBalance,
  actualRenderCost,
  initialEstimate,
  costDifference,
  estimatedDuration,
  sceneCount,
  notifyOnCompletion,
  onNotifyOnCompletionChange,
  onRender,
  disabled,
}: RenderVideoButtonProps) => {
  return (
    <div className="space-y-4">
      {/* Notification Toggle */}
      <NotifyOnCompletionToggle
        checked={notifyOnCompletion}
        onCheckedChange={onNotifyOnCompletionChange}
        disabled={disabled || isRendering}
        description="Get an email when your video is ready"
      />
      
      <Card className="p-6 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm">
            <Coins className="w-5 h-5 text-primary" />
          <span className="text-muted-foreground">
            Balance: <span className="font-semibold text-foreground">{tokenBalance.toFixed(2)}</span>
          </span>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="lg"
              disabled={isRendering || tokenBalance < actualRenderCost || disabled}
              className="bg-gradient-to-r from-primary via-primary to-primary/80 hover:scale-105 transition-transform font-bold w-full sm:w-auto"
            >
              <Play className="w-5 h-5 mr-2 flex-shrink-0" />
              <span className="truncate">
                <span className="hidden sm:inline">Render Video ({actualRenderCost.toFixed(2)} credits)</span>
                <span className="sm:hidden">Render ({actualRenderCost.toFixed(2)} credits)</span>
              </span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Render Video?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>This will create your final video with {sceneCount} scenes and charge your account.</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Base cost (from {estimatedDuration}s duration):</span>
                    <span>{initialEstimate.toFixed(2)} credits</span>
                  </div>
                  {costDifference !== 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Script adjustment:</span>
                      <span className={costDifference > 0 ? "text-amber-600" : "text-green-600"}>
                        {costDifference > 0 ? '+' : ''}{costDifference.toFixed(2)} credits
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="font-semibold">You will be charged:</span>
                    <span className="font-bold text-primary">{actualRenderCost.toFixed(2)} credits</span>
                  </div>
                  {costDifference !== 0 && (
                    <p className="text-xs text-muted-foreground">
                      {costDifference > 0 
                        ? `Script expanded by ${Math.floor(Math.abs(costDifference / 0.25) * 100)}+ characters`
                        : `Script shortened by ${Math.floor(Math.abs(costDifference / 0.25) * 100)}+ characters`}
                    </p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground pt-2 border-t">
                  {tokenBalance < actualRenderCost
                    ? `Insufficient balance. Need ${actualRenderCost.toFixed(2)} credits to render.`
                    : `Current balance: ${tokenBalance.toFixed(2)} credits`} • Est. time: ~60s
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onRender}>Render Video</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        </div>
      </Card>
    </div>
  );
};
