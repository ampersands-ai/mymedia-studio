import type { MergedTemplate } from "@/hooks/useTemplates";
import type { SortOption } from "@/types/admin";

/**
 * Sort templates by the specified option
 * @param templates - Array of templates to sort
 * @param sortBy - Sort option (display_order, name, category, status, type)
 * @returns Sorted array of templates
 */
export function sortTemplates(
  templates: MergedTemplate[],
  sortBy: SortOption
): MergedTemplate[] {
  return [...templates].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return (a.name ?? '').localeCompare(b.name ?? '');
      case "category":
        return (a.category ?? '').localeCompare(b.category ?? '');
      case "display_order":
        return (a.display_order ?? 0) - (b.display_order ?? 0);
      case "status":
        return (a.is_active === b.is_active) ? 0 : a.is_active ? -1 : 1;
      case "type":
        return a.template_type.localeCompare(b.template_type);
      default:
        return 0;
    }
  });
}
