import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Minus, Trash2, Film, Clock, Sparkles } from "lucide-react";

export interface Shot {
  Scene: string;
  duration: number;
}

interface StoryboardShotsInputProps {
  value: Shot[];
  onChange: (shots: Shot[]) => void;
  totalDuration: number;
  required?: boolean;
}

export const StoryboardShotsInput = ({ 
  value, 
  onChange, 
  totalDuration, 
  required 
}: StoryboardShotsInputProps) => {
  const [expandedScene, setExpandedScene] = useState<number | null>(null);

  // Initialize with 2 scenes if empty
  const shots: Shot[] = value.length > 0 ? value : [
    { Scene: "", duration: totalDuration / 2 },
    { Scene: "", duration: totalDuration / 2 }
  ];

  // Calculate total used duration
  const usedDuration = shots.reduce((sum, shot) => sum + shot.duration, 0);
  const remainingDuration = totalDuration - usedDuration;
  const isBalanced = Math.abs(remainingDuration) < 0.1;
  const progressPercent = Math.min(100, (usedDuration / totalDuration) * 100);

  const updateShot = (index: number, field: keyof Shot, newValue: string | number) => {
    const newShots = [...shots];
    if (field === "Scene") {
      newShots[index] = { ...newShots[index], Scene: newValue as string };
    } else {
      newShots[index] = { ...newShots[index], duration: newValue as number };
    }
    onChange(newShots);
  };

  const addScene = () => {
    // Add a new scene with minimum duration
    const minDuration = 1;
    const newShots = [...shots, { Scene: "", duration: minDuration }];
    onChange(newShots);
  };

  const removeScene = (index: number) => {
    if (shots.length <= 1) return;
    const newShots = shots.filter((_, i) => i !== index);
    onChange(newShots);
  };

  const adjustDuration = (index: number, delta: number) => {
    const currentDuration = shots[index].duration;
    const newDuration = Math.max(0.5, Math.min(totalDuration, currentDuration + delta));
    updateShot(index, "duration", Math.round(newDuration * 10) / 10);
  };

  const autoDistribute = () => {
    const count = shots.length;
    const perScene = Math.round((totalDuration / count) * 10) / 10;
    const remainder = Math.round((totalDuration - perScene * count) * 10) / 10;
    
    const newShots = shots.map((shot, i) => ({
      ...shot,
      duration: i === 0 ? perScene + remainder : perScene
    }));
    onChange(newShots);
  };

  // Determine progress bar color
  const getProgressColor = () => {
    if (isBalanced) return "bg-green-500";
    if (usedDuration > totalDuration) return "bg-destructive";
    return "bg-yellow-500";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Film className="h-5 w-5 text-primary" />
          <Label className="text-base font-semibold">
            Storyboard Scenes
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={autoDistribute}
          className="gap-1.5"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Auto-distribute
        </Button>
      </div>

      {/* Duration Progress */}
      <Card className="border-border/50">
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Duration:</span>
              <span className={`font-medium ${isBalanced ? 'text-green-600' : usedDuration > totalDuration ? 'text-destructive' : 'text-yellow-600'}`}>
                {usedDuration.toFixed(1)}s
              </span>
              <span className="text-muted-foreground">/ {totalDuration}s</span>
            </div>
            {!isBalanced && (
              <span className={`text-xs font-medium ${usedDuration > totalDuration ? 'text-destructive' : 'text-yellow-600'}`}>
                {usedDuration > totalDuration 
                  ? `${(usedDuration - totalDuration).toFixed(1)}s over` 
                  : `${remainingDuration.toFixed(1)}s remaining`}
              </span>
            )}
          </div>
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={`absolute left-0 top-0 h-full transition-all duration-300 rounded-full ${getProgressColor()}`}
              style={{ width: `${Math.min(100, progressPercent)}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Scene Cards */}
      <div className="space-y-3">
        {shots.map((shot, index) => (
          <Card 
            key={index} 
            className={`border transition-all ${expandedScene === index ? 'border-primary/50 shadow-sm' : 'border-border/50'}`}
          >
            <CardContent className="p-4 space-y-3">
              {/* Scene Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                    {index + 1}
                  </span>
                  <span className="font-medium text-sm">Scene {index + 1}</span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Duration Controls */}
                  <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => adjustDuration(index, -0.5)}
                      disabled={shot.duration <= 0.5}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="w-12 text-center text-sm font-medium">
                      {shot.duration.toFixed(1)}s
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => adjustDuration(index, 0.5)}
                      disabled={usedDuration >= totalDuration && shot.duration >= totalDuration}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {/* Delete Button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeScene(index)}
                    disabled={shots.length <= 1}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Scene Description */}
              <Textarea
                value={shot.Scene}
                onChange={(e) => updateShot(index, "Scene", e.target.value)}
                onFocus={() => setExpandedScene(index)}
                onBlur={() => setExpandedScene(null)}
                placeholder={`Describe scene ${index + 1}... (e.g., "A serene mountain landscape at sunrise, with mist rolling through the valleys")`}
                className={`resize-none transition-all ${expandedScene === index ? 'min-h-[120px]' : 'min-h-[80px]'}`}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Scene Button */}
      <Button
        type="button"
        variant="outline"
        onClick={addScene}
        className="w-full border-dashed gap-2"
      >
        <Plus className="h-4 w-4" />
        Add Scene
      </Button>

      {/* Validation Warning */}
      {!isBalanced && (
        <p className="text-xs text-muted-foreground text-center">
          Tip: Scene durations must equal {totalDuration}s total. Use "Auto-distribute" to balance them evenly.
        </p>
      )}
    </div>
  );
};
