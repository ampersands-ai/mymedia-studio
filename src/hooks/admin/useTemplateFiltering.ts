import { useMemo, useCallback } from 'react';
import type { MergedTemplate } from '@/hooks/useTemplates';
import {
  filterTemplatesByCategory,
  getUniqueCategories,
} from '@/lib/admin/template-filtering';

/**
 * Custom hook for filtering templates by category with memoization
 * @param templates - Array of templates to filter
 * @param selectedCategories - Currently selected categories
 * @param onCategoriesChange - Callback to update selected categories
 * @returns Object with filtered templates, categories, and toggle function
 */
export function useTemplateFiltering(
  templates: MergedTemplate[],
  selectedCategories: string[],
  onCategoriesChange: (categories: string[]) => void
) {
  // Extract unique categories with counts
  const { categories: uniqueCategories, counts: categoryCounts } = useMemo(() => {
    return getUniqueCategories(templates);
  }, [templates]);

  // Filter templates by selected categories
  const filteredTemplates = useMemo(() => {
    return filterTemplatesByCategory(templates, selectedCategories);
  }, [templates, selectedCategories]);

  /**
   * Toggle a category selection or switch to 'All'
   */
  const toggleCategory = useCallback((category: string) => {
    if (category === 'All') {
      onCategoriesChange(['All']);
    } else {
      const withoutAll = selectedCategories.filter(c => c !== 'All');
      if (withoutAll.includes(category)) {
        const filtered = withoutAll.filter(c => c !== category);
        onCategoriesChange(filtered.length === 0 ? ['All'] : filtered);
      } else {
        onCategoriesChange([...withoutAll, category]);
      }
    }
  }, [selectedCategories, onCategoriesChange]);

  return {
    filteredTemplates,
    uniqueCategories,
    categoryCounts,
    toggleCategory,
  };
}
