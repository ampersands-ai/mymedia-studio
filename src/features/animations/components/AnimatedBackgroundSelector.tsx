import { useState } from "react";
import { useCreateAnimation } from "../hooks";
import { AnimationJobStatus } from "./AnimationJobStatus";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { Sparkles, ArrowLeft, Loader2 } from "lucide-react";

interface Props {
  script: string;
  audioUrl?: string;
  timestamps?: Array<{ word: string; start: number; end: number }>;
  duration: number;
  onVideoReady: (videoUrl: string) => void;
}

const colorSchemes = {
  dark: {
    primary: "#22c55e",
    secondary: "#94a3b8",
    background: "#0f172a",
    accent: "#f59e0b",
  },
  light: {
    primary: "#2563eb",
    secondary: "#64748b",
    background: "#f8fafc",
    accent: "#f59e0b",
  },
  warm: {
    primary: "#f97316",
    secondary: "#a8a29e",
    background: "#1c1917",
    accent: "#eab308",
  },
  cool: {
    primary: "#38bdf8",
    secondary: "#7dd3fc",
    background: "#0c4a6e",
    accent: "#a78bfa",
  },
};

const captionStyles = ["karaoke", "bounce", "typewriter", "wave", "highlight", "static"] as const;

const animationStyles = [
  { value: "stick-figure", label: "Stick Figure", description: "Clean XKCD-style" },
  { value: "illustrated", label: "Illustrated", description: "Colorful graphics" },
  { value: "minimal", label: "Minimal", description: "Icons & text" },
] as const;

export function AnimatedBackgroundSelector({
  script,
  audioUrl,
  timestamps,
  duration,
  onVideoReady,
}: Props) {
  const [style, setStyle] = useState<"stick-figure" | "illustrated" | "minimal">("stick-figure");
  const [captionStyle, setCaptionStyle] = useState("karaoke");
  const [colorScheme, setColorScheme] = useState<keyof typeof colorSchemes>("dark");
  const [jobId, setJobId] = useState<string | null>(null);

  const { createAnimation, loading, error } = useCreateAnimation();

  const handleGenerate = async () => {
    const id = await createAnimation({
      script,
      audioUrl,
      timestamps,
      duration,
      style,
      captionStyle,
      backgroundType: "animated",
      backgroundStyle: "particles",
      overlayType: "explainer",
      colorScheme: colorSchemes[colorScheme],
    });
    if (id) setJobId(id);
  };

  if (jobId) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setJobId(null)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <AnimationJobStatus
          jobId={jobId}
          onComplete={onVideoReady}
          onError={(err) => console.error("Animation failed:", err)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Animation Style */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Animation Style</Label>
        <RadioGroup
          value={style}
          onValueChange={(val) => setStyle(val as typeof style)}
          className="grid grid-cols-3 gap-3"
        >
          {animationStyles.map((s) => (
            <div key={s.value}>
              <RadioGroupItem
                value={s.value}
                id={s.value}
                className="peer sr-only"
              />
              <Label
                htmlFor={s.value}
                className={cn(
                  "flex flex-col items-center justify-center rounded-lg border-2 border-border bg-card p-4 cursor-pointer transition-all",
                  "hover:bg-accent/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                )}
              >
                <span className="text-sm font-medium">{s.label}</span>
                <span className="text-xs text-muted-foreground">{s.description}</span>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Caption Style */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Caption Style</Label>
        <div className="flex flex-wrap gap-2">
          {captionStyles.map((cs) => (
            <button
              key={cs}
              onClick={() => setCaptionStyle(cs)}
              className={cn(
                "px-3 py-1.5 text-sm rounded-full border transition-all capitalize",
                captionStyle === cs
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-muted-foreground"
              )}
            >
              {cs}
            </button>
          ))}
        </div>
      </div>

      {/* Color Scheme */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Color Scheme</Label>
        <div className="flex gap-3">
          {(Object.keys(colorSchemes) as Array<keyof typeof colorSchemes>).map((name) => {
            const scheme = colorSchemes[name];
            return (
              <button
                key={name}
                onClick={() => setColorScheme(name)}
                title={name}
                className={cn(
                  "w-12 h-12 rounded-lg overflow-hidden border-2 transition-all",
                  colorScheme === name ? "border-primary ring-2 ring-primary/20" : "border-transparent"
                )}
              >
                <div className="w-full h-full flex">
                  <div
                    className="w-1/2 h-full"
                    style={{ backgroundColor: scheme.background }}
                  />
                  <div
                    className="w-1/2 h-full"
                    style={{ backgroundColor: scheme.primary }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full"
        size="lg"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Animation
          </>
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        ~30-60 seconds • ~$0.25
      </p>
    </div>
  );
}
