import { Bell, BellOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface NotifyOnCompletionToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
  description?: string;
}

export function NotifyOnCompletionToggle({
  checked,
  onCheckedChange,
  disabled = false,
  className,
  label = 'Notify me when complete',
  description = 'Get an email notification when your generation finishes',
}: NotifyOnCompletionToggleProps) {
  return (
    <div 
      className={cn(
        'flex items-center justify-between p-3 rounded-lg border bg-card/50 transition-colors',
        checked ? 'border-primary/30 bg-primary/5' : 'border-border',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <div className="flex items-center gap-3">
        {checked ? (
          <Bell className="h-4 w-4 text-primary" />
        ) : (
          <BellOff className="h-4 w-4 text-muted-foreground" />
        )}
        <div className="space-y-0.5">
          <Label 
            htmlFor="notify-on-completion" 
            className={cn(
              'text-sm font-medium cursor-pointer',
              disabled && 'cursor-not-allowed'
            )}
          >
            {label}
          </Label>
          {description && (
            <p className="text-xs text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
      <Switch
        id="notify-on-completion"
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}
