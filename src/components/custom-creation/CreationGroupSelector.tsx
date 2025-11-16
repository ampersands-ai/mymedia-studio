import { CREATION_GROUPS, type CreationGroup } from "@/constants/creation-groups";
import { cn } from "@/lib/utils";

interface CreationGroupSelectorProps {
  selectedGroup: CreationGroup;
  onGroupChange: (group: CreationGroup) => void;
}

/**
 * Horizontal scrolling group selection buttons
 */
export const CreationGroupSelector: React.FC<CreationGroupSelectorProps> = ({
  selectedGroup,
  onGroupChange,
}) => {
  return (
    <div className="mb-6">
      <div className="flex flex-wrap gap-2 justify-center">
        {CREATION_GROUPS.map((group) => (
          <button
            key={group.id}
            onClick={() => onGroupChange(group.id)}
            className={cn(
              "p-1.5 md:p-2 rounded-xl transition-all duration-200 flex flex-col items-center gap-1 w-[115px] md:w-[130px] h-[80px] md:h-[90px] group",
              selectedGroup === group.id
                ? "bg-primary-500 shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] text-neutral-900 font-bold border-2 border-primary"
                : "bg-neutral-100 border border-gray-200 text-neutral-600 hover:bg-neutral-200 hover:text-secondary-700 hover:border-gray-300 shadow-sm hover:shadow-md"
            )}
          >
            <group.Icon className="h-6 w-6 md:h-8 md:w-8 transition-transform duration-300 group-hover:animate-[bounce_0.6s_ease-in-out]" />
            <div className="flex flex-col items-center gap-0">
              <span className="font-semibold text-xs md:text-sm text-center leading-tight">{group.label}</span>
              <span className="text-[9px] md:text-[10px] font-medium opacity-80 text-center whitespace-nowrap leading-tight">
                {'subtitle' in group ? group.subtitle : '\u00A0'}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
