/**
 * Scenes Collapsible Container Component
 * Wraps all scene cards with collapse/expand functionality
 */

import { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface ScenesCollapsibleProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isRendering: boolean;
  isComplete: boolean;
  children: ReactNode;
}

/**
 * Collapsible container for scene cards
 * Shows toggle button only when rendering or complete
 */
export const ScenesCollapsible = ({
  open,
  onOpenChange,
  isRendering,
  isComplete,
  children,
}: ScenesCollapsibleProps) => {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      {/* Toggle button - only show when there's an active render or completed video */}
      {(isRendering || isComplete) && (
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full mb-4">
            {open ? 'Hide Scenes' : 'Show Scenes'}
            <ChevronDown className={cn(
              "ml-2 h-4 w-4 transition-transform",
              open && "rotate-180"
            )} />
          </Button>
        </CollapsibleTrigger>
      )}
      
      <CollapsibleContent forceMount className={cn(!open && "hidden")}>
        <div className="space-y-4">
          <h3 className="text-lg font-bold">📋 Scenes</h3>
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
