import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

export type StatusFilter = 'all' | 'completed' | 'failed' | 'pending';
export type ContentTypeFilter = 'all' | 'image' | 'video' | 'audio' | 'storyboard' | 'video_editor';

const isValidStatusFilter = (value: string | null): value is StatusFilter => {
  return value === 'all' || value === 'completed' || value === 'failed' || value === 'pending';
};

export const useGenerationFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize from URL params or default to 'completed'
  const initialStatus = searchParams.get('status');
  const [statusFilter, setStatusFilterState] = useState<StatusFilter>(
    isValidStatusFilter(initialStatus) ? initialStatus : 'completed'
  );
  const [contentTypeFilter, setContentTypeFilter] = useState<ContentTypeFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Sync URL param to state on mount and when URL changes
  useEffect(() => {
    const urlStatus = searchParams.get('status');
    if (isValidStatusFilter(urlStatus) && urlStatus !== statusFilter) {
      setStatusFilterState(urlStatus);
    }
  }, [searchParams, statusFilter]);

  // Update URL when status filter changes
  const setStatusFilter = (filter: StatusFilter) => {
    setStatusFilterState(filter);
    if (filter === 'completed') {
      // Remove param for default value
      searchParams.delete('status');
    } else {
      searchParams.set('status', filter);
    }
    setSearchParams(searchParams, { replace: true });
  };

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, contentTypeFilter]);

  return {
    statusFilter,
    setStatusFilter,
    contentTypeFilter,
    setContentTypeFilter,
    currentPage,
    setCurrentPage,
  };
};
