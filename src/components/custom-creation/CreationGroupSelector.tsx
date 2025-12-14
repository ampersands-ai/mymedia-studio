import { CREATION_GROUPS, type CreationGroup } from "@/constants/creation-groups";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { Clock } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CreationGroupSelectorProps {
  selectedGroup: CreationGroup;
  onGroupChange: (group: CreationGroup) => void;
}

/**
 * Horizontal scrolling group selection buttons
 * Mobile: Single-row horizontal scroll with compact cards
 * Desktop: Flex-wrap centered grid
 */
export const CreationGroupSelector: React.FC<CreationGroupSelectorProps> = ({
  selectedGroup,
  onGroupChange,
}) => {
  const isMobile = useIsMobile();
  const { isGroupEnabled, isGroupComingSoon } = useFeatureFlags();

  // Filter groups based on feature flags
  const visibleGroups = CREATION_GROUPS.filter((group) => isGroupEnabled(group.id));

  const renderGroupButton = (group: typeof CREATION_GROUPS[number]) => {
    const isComingSoon = isGroupComingSoon(group.id);
    const isSelected = selectedGroup === group.id;

    const buttonContent = (
      <button
        key={group.id}
        onClick={() => !isComingSoon && onGroupChange(group.id)}
        disabled={isComingSoon}
        className={cn(
          "rounded-xl transition-all duration-200 flex items-center group shrink-0 snap-start",
          isMobile 
            ? "p-2 gap-2 h-12 px-3"
            : "p-1.5 md:p-2 flex-col gap-1 w-[115px] md:w-[130px] h-[80px] md:h-[90px]",
          isComingSoon
            ? "bg-neutral-100 border border-gray-200 text-neutral-400 cursor-not-allowed opacity-60"
            : isSelected
              ? "bg-primary-500 shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] text-neutral-900 font-bold border-2 border-primary"
              : "bg-neutral-100 border border-gray-200 text-neutral-600 hover:bg-neutral-200 hover:text-secondary-700 hover:border-gray-300 shadow-sm hover:shadow-md"
        )}
      >
        <group.Icon className={cn(
          "transition-transform duration-300",
          !isComingSoon && "group-hover:animate-[bounce_0.6s_ease-in-out]",
          isMobile ? "h-5 w-5" : "h-6 w-6 md:h-8 md:w-8"
        )} />
        <div className={cn(
          "flex gap-0",
          isMobile ? "flex-row items-center" : "flex-col items-center"
        )}>
          <span className={cn(
            "font-semibold leading-tight",
            isMobile ? "text-xs whitespace-nowrap" : "text-xs md:text-sm text-center"
          )}>
            {group.label}
          </span>
          {!isMobile && (
            <span className="text-[9px] md:text-[10px] font-medium opacity-80 text-center whitespace-nowrap leading-tight">
              {isComingSoon ? (
                <span className="flex items-center gap-0.5">
                  <Clock className="h-2.5 w-2.5" />
                  Coming soon
                </span>
              ) : (
                'subtitle' in group ? group.subtitle : '\u00A0'
              )}
            </span>
          )}
        </div>
        {isMobile && isComingSoon && (
          <Clock className="h-3.5 w-3.5 ml-1 text-muted-foreground" />
        )}
      </button>
    );

    if (isComingSoon) {
      return (
        <TooltipProvider key={group.id}>
          <Tooltip>
            <TooltipTrigger asChild>
              {buttonContent}
            </TooltipTrigger>
            <TooltipContent>
              <p>Coming soon</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return buttonContent;
  };

  return (
    <div className="mb-4 md:mb-6">
      <div 
        className={cn(
          isMobile 
            ? "flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide -mx-4 px-4"
            : "flex flex-wrap gap-2 justify-center"
        )}
      >
        {visibleGroups.map(renderGroupButton)}
      </div>
    </div>
  );
};
