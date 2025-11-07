import { useMemo } from 'react';
import type { MergedTemplate } from '@/hooks/useTemplates';
import type { SortOption } from '@/types/admin';
import { sortTemplates } from '@/lib/admin/template-sorting';

/**
 * Custom hook for sorting templates with memoization
 * @param templates - Array of templates to sort
 * @param sortBy - Current sort option
 * @returns Object with sorted templates
 */
export function useTemplateSorting(
  templates: MergedTemplate[],
  sortBy: SortOption
) {
  const sortedTemplates = useMemo(() => {
    return sortTemplates(templates, sortBy);
  }, [templates, sortBy]);

  return {
    sortedTemplates,
  };
}
