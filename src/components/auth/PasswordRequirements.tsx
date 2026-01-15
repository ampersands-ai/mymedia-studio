import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const requirements: PasswordRequirement[] = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "One uppercase letter (A-Z)", test: (p) => /[A-Z]/.test(p) },
  { label: "One lowercase letter (a-z)", test: (p) => /[a-z]/.test(p) },
  { label: "One number (0-9)", test: (p) => /[0-9]/.test(p) },
  { label: "One special character (!@#$...)", test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

interface PasswordRequirementsProps {
  password: string;
  show: boolean;
}

export function PasswordRequirements({ password, show }: PasswordRequirementsProps) {
  if (!show) return null;

  return (
    <div className="mt-2 p-3 rounded-lg bg-muted/50 border border-border">
      <p className="text-xs font-semibold text-foreground mb-2">Password requirements:</p>
      <ul className="space-y-1">
        {requirements.map((req, index) => {
          const isMet = req.test(password);
          return (
            <li key={index} className="flex items-center gap-2 text-xs">
              {isMet ? (
                <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />
              ) : (
                <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
              <span className={cn(
                isMet ? "text-green-600" : "text-muted-foreground"
              )}>
                {req.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function validatePasswordRequirements(password: string): boolean {
  return requirements.every((req) => req.test(password));
}
