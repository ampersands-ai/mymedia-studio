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
              "p-2 md:p-3 rounded-xl transition-all duration-200 flex flex-col items-center gap-2 min-w-[100px] group",
              selectedGroup === group.id
                ? "bg-primary-500 shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] text-neutral-900 font-bold border-2 border-primary"
                : "bg-neutral-100 border border-gray-200 text-neutral-600 hover:bg-neutral-200 hover:text-secondary-700 hover:border-gray-300 shadow-sm hover:shadow-md"
            )}
          >
            <group.Icon className="h-7 w-7 md:h-9 md:w-9 transition-transform duration-300 group-hover:animate-[bounce_0.6s_ease-in-out]" />
            <div className="flex flex-col items-center gap-0.5">
              <span className="font-semibold text-xs md:text-sm">{group.label}</span>
              {'subtitle' in group && <span className="text-[10px] opacity-70">{group.subtitle}</span>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
