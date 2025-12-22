import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
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
  const [searchParams, setSearchParams] = useSearchParams();
  
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
    if (filter === 'completed') {
      searchParams.delete('status');
    } else {
      searchParams.set('status', filter);
    }
    setSearchParams(searchParams, { replace: true });
  };

  // Update URL when date preset changes
  const setDatePreset = (preset: DateRangePreset) => {
    setDatePresetState(preset);
    if (preset === 'all') {
      searchParams.delete('date');
    } else {
      searchParams.set('date', preset);
    }
    setSearchParams(searchParams, { replace: true });
  };

  // Update URL when model filter changes
  const setModelFilter = (model: string) => {
    setModelFilterState(model);
    if (model === 'all') {
      searchParams.delete('model');
    } else {
      searchParams.set('model', model);
    }
    setSearchParams(searchParams, { replace: true });
  };

  // Update URL when search query changes
  const setSearchQuery = useCallback((query: string) => {
    setSearchQueryState(query);
    if (!query) {
      searchParams.delete('search');
    } else {
      searchParams.set('search', query);
    }
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Update URL when collection filter changes
  const setCollectionFilter = useCallback((collection: string) => {
    setCollectionFilterState(collection);
    if (collection === 'all') {
      searchParams.delete('collection');
    } else {
      searchParams.set('collection', collection);
    }
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams]);

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
