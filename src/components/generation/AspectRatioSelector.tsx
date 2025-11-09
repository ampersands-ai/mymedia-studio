import { Button } from "@/components/ui/button";

export interface AspectRatio {
  label: string;
  value: number | null; // null = free crop
}

const aspectRatios: AspectRatio[] = [
  { label: "1:1", value: 1 },
  { label: "16:9", value: 16 / 9 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:2", value: 3 / 2 },
  { label: "9:16", value: 9 / 16 },
  { label: "4:5", value: 4 / 5 },
  { label: "2:3", value: 2 / 3 },
  { label: "Free", value: null },
];

interface AspectRatioSelectorProps {
  selectedRatio: number | null;
  onRatioChange: (ratio: number | null) => void;
}

export const AspectRatioSelector = ({
  selectedRatio,
  onRatioChange,
}: AspectRatioSelectorProps) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">
        Aspect Ratio
      </label>
      <div className="flex flex-wrap gap-2">
        {aspectRatios.map((ratio) => (
          <Button
            key={ratio.label}
            variant={selectedRatio === ratio.value ? "default" : "outline"}
            size="sm"
            onClick={() => onRatioChange(ratio.value)}
            className="min-w-[60px]"
          >
            {ratio.label}
          </Button>
        ))}
      </div>
    </div>
  );
};
