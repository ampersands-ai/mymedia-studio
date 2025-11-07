import type { MergedTemplate } from "@/hooks/useTemplates";

/**
 * Filter templates by selected categories
 * @param templates - Array of templates to filter
 * @param selectedCategories - Array of category names to filter by (if includes 'All', returns all templates)
 * @returns Filtered array of templates
 */
export function filterTemplatesByCategory(
  templates: MergedTemplate[],
  selectedCategories: string[]
): MergedTemplate[] {
  const showAllCategories = selectedCategories.includes('All');
  return showAllCategories 
    ? templates 
    : templates.filter(t => selectedCategories.includes(t.category));
}

/**
 * Extract unique categories from templates with counts
 * @param templates - Array of templates to analyze
 * @returns Object with categories array and counts record
 */
export function getUniqueCategories(
  templates: MergedTemplate[]
): { 
  categories: string[]; 
  counts: Record<string, number>;
} {
  const uniqueCategories = Array.from(new Set(templates.map(t => t.category))).sort();
  const counts = uniqueCategories.reduce((acc, cat) => {
    acc[cat] = templates.filter(t => t.category === cat).length;
    return acc;
  }, {} as Record<string, number>);
  
  return { categories: uniqueCategories, counts };
}
