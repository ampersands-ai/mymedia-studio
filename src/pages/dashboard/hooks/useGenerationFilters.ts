import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { subDays, startOfDay, endOfDay } from "date-fns";

export type StatusFilter = 'all' | 'completed' | 'failed' | 'pending';
export type ContentTypeFilter = 'all' | 'image' | 'video' | 'audio' | 'storyboard' | 'video_editor';
export type DateRangePreset = 'all' | 'today' | '7d' | '30d' | '90d';

const isValidStatusFilter = (value: string | null): value is StatusFilter => {
  return value === 'all' || value === 'completed' || value === 'failed' || value === 'pending';
};

const isValidDatePreset = (value: string | null): value is DateRangePreset => {
  return value === 'all' || value === 'today' || value === '7d' || value === '30d' || value === '90d';
};

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export const getDateRangeFromPreset = (preset: DateRangePreset): DateRange => {
  const now = new Date();
  switch (preset) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) };
    case '7d':
      return { from: startOfDay(subDays(now, 7)), to: endOfDay(now) };
    case '30d':
      return { from: startOfDay(subDays(now, 30)), to: endOfDay(now) };
    case '90d':
      return { from: startOfDay(subDays(now, 90)), to: endOfDay(now) };
    case 'all':
    default:
      return { from: undefined, to: undefined };
  }
};

export const useGenerationFilters = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Helper to update URL search params via router.replace
  const updateSearchParams = useCallback((updater: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    updater(params);
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname);
  }, [searchParams, router, pathname]);

  // Initialize from URL params or defaults
  const initialStatus = searchParams.get('status');
  const initialDatePreset = searchParams.get('date');
  const initialModel = searchParams.get('model');
  const initialSearch = searchParams.get('search');
  const initialCollection = searchParams.get('collection');

  const [statusFilter, setStatusFilterState] = useState<StatusFilter>(
    isValidStatusFilter(initialStatus) ? initialStatus : 'completed'
  );
  const [contentTypeFilter, setContentTypeFilter] = useState<ContentTypeFilter>('all');
  const [datePreset, setDatePresetState] = useState<DateRangePreset>(
    isValidDatePreset(initialDatePreset) ? initialDatePreset : 'all'
  );
  const [modelFilter, setModelFilterState] = useState<string>(initialModel || 'all');
  const [searchQuery, setSearchQueryState] = useState<string>(initialSearch || '');
  const [collectionFilter, setCollectionFilterState] = useState<string>(initialCollection || 'all');
  const [currentPage, setCurrentPage] = useState(1);

  // Compute date range from preset
  const dateRange = getDateRangeFromPreset(datePreset);

  // Sync URL param to state on mount and when URL changes
  useEffect(() => {
    const urlStatus = searchParams.get('status');
    if (isValidStatusFilter(urlStatus) && urlStatus !== statusFilter) {
      setStatusFilterState(urlStatus);
    }
    const urlDate = searchParams.get('date');
    if (isValidDatePreset(urlDate) && urlDate !== datePreset) {
      setDatePresetState(urlDate);
    }
    const urlModel = searchParams.get('model');
    if (urlModel && urlModel !== modelFilter) {
      setModelFilterState(urlModel);
    }
    const urlSearch = searchParams.get('search');
    if (urlSearch !== null && urlSearch !== searchQuery) {
      setSearchQueryState(urlSearch);
    }
    const urlCollection = searchParams.get('collection');
    if (urlCollection && urlCollection !== collectionFilter) {
      setCollectionFilterState(urlCollection);
    }
  }, [searchParams, statusFilter, datePreset, modelFilter, searchQuery, collectionFilter]);

  // Update URL when status filter changes
  const setStatusFilter = (filter: StatusFilter) => {
    setStatusFilterState(filter);
    updateSearchParams((params) => {
      if (filter === 'completed') {
        params.delete('status');
      } else {
        params.set('status', filter);
      }
    });
  };

  // Update URL when date preset changes
  const setDatePreset = (preset: DateRangePreset) => {
    setDatePresetState(preset);
    updateSearchParams((params) => {
      if (preset === 'all') {
        params.delete('date');
      } else {
        params.set('date', preset);
      }
    });
  };

  // Update URL when model filter changes
  const setModelFilter = (model: string) => {
    setModelFilterState(model);
    updateSearchParams((params) => {
      if (model === 'all') {
        params.delete('model');
      } else {
        params.set('model', model);
      }
    });
  };

  // Update URL when search query changes
  const setSearchQuery = useCallback((query: string) => {
    setSearchQueryState(query);
    updateSearchParams((params) => {
      if (!query) {
        params.delete('search');
      } else {
        params.set('search', query);
      }
    });
  }, [updateSearchParams]);

  // Update URL when collection filter changes
  const setCollectionFilter = useCallback((collection: string) => {
    setCollectionFilterState(collection);
    updateSearchParams((params) => {
      if (collection === 'all') {
        params.delete('collection');
      } else {
        params.set('collection', collection);
      }
    });
  }, [updateSearchParams]);

  // Reset to page 1 when any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, contentTypeFilter, datePreset, modelFilter, searchQuery, collectionFilter]);

  return {
    statusFilter,
    setStatusFilter,
    contentTypeFilter,
    setContentTypeFilter,
    datePreset,
    setDatePreset,
    dateRange,
    modelFilter,
    setModelFilter,
    searchQuery,
    setSearchQuery,
    collectionFilter,
    setCollectionFilter,
    currentPage,
    setCurrentPage,
  };
};
