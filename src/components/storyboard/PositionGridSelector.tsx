import { cn } from "@/lib/utils";

interface PositionGridSelectorProps {
  value: string;
  onChange: (position: string) => void;
}

const GRID_POSITIONS = [
  { value: "top-left", row: 0, col: 0 },
  { value: "top-center", row: 0, col: 1 },
  { value: "top-right", row: 0, col: 2 },
  { value: "mid-left-center", row: 1, col: 0 },
  { value: "mid-center", row: 1, col: 1 },
  { value: "mid-right-center", row: 1, col: 2 },
  { value: "mid-bottom-center", row: 2, col: 0 },
  { value: "bottom-left", row: 2, col: 1 },
  { value: "bottom-center", row: 2, col: 1 },
  { value: "bottom-right", row: 2, col: 2 }
];

export function PositionGridSelector({ value, onChange }: PositionGridSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-2 p-4 bg-muted/30 rounded-lg border border-border">
      {GRID_POSITIONS.map((pos) => (
        <button
          key={pos.value}
          type="button"
          onClick={() => onChange(pos.value)}
          className={cn(
            "h-12 rounded-md border-2 transition-all duration-200",
            "hover:scale-105 hover:shadow-md",
            value === pos.value
              ? "border-primary bg-primary/20 shadow-lg scale-105"
              : "border-border bg-background hover:border-primary/50"
          )}
          aria-label={pos.value}
        >
          <div className={cn(
            "w-2 h-2 mx-auto rounded-full transition-all",
            value === pos.value ? "bg-primary scale-150" : "bg-muted-foreground"
          )} />
        </button>
      ))}
    </div>
  );
}
