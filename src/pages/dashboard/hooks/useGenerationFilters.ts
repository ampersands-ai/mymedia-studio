import { useState, useEffect } from "react";

export type StatusFilter = 'all' | 'completed' | 'failed';
export type ContentTypeFilter = 'all' | 'image' | 'video' | 'audio' | 'storyboard';

export const useGenerationFilters = () => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('completed');
  const [contentTypeFilter, setContentTypeFilter] = useState<ContentTypeFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);

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
