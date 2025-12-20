/**
 * useAdminUsers Hook
 *
 * Server-side pagination, search, filtering, and sorting for admin user management.
 * Uses database functions for efficient queries on large user bases.
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePagination } from '@/hooks/usePagination';
import { useDebounce } from '@/hooks/useDebounce';

export interface AdminUser {
  id: string;
  email: string | null;
  profile_name: string | null;
  email_verified: boolean | null;
  created_at: string;
  last_activity_at: string | null;
  plan: string | null;
  subscription_status: string | null;
  tokens_remaining: number | null;
  tokens_total: number | null;
  is_admin: boolean;
  is_mod_exempt: boolean;
}

export interface AdminUserStats {
  total_users: number;
  active_users: number;
  admin_count: number;
  verified_users: number;
  freemium_users: number;
  premium_users: number;
  pro_users: number;
}

export interface UserFilters {
  plan: string;
  status: string;
  role: string;
  emailVerified: string;
}

export type SortColumn = 'created_at' | 'email' | 'tokens_remaining' | 'last_activity_at';
export type SortDirection = 'asc' | 'desc';

const PAGE_SIZE = 50;

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminUserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [filters, setFilters] = useState<UserFilters>({
    plan: '',
    status: '',
    role: '',
    emailVerified: '',
  });
  
  // Sorting
  const [sortColumn, setSortColumn] = useState<SortColumn>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Pagination
  const pagination = usePagination({
    pageSize: PAGE_SIZE,
    onPageChange: () => {
      // Will trigger refetch via useEffect
    },
  });

  // Fetch users with server-side pagination, search, and filters
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: queryError } = await supabase.rpc('search_admin_users', {
        search_term: debouncedSearch || undefined,
        filter_plan: filters.plan || undefined,
        filter_status: filters.status || undefined,
        filter_role: filters.role || undefined,
        filter_email_verified: filters.emailVerified === '' ? undefined : filters.emailVerified === 'true',
        sort_column: sortColumn,
        sort_direction: sortDirection,
        page_offset: pagination.from,
        page_limit: PAGE_SIZE,
      });

      if (queryError) throw queryError;

      if (data && data.length > 0) {
        // Extract total count from first row
        const totalCount = Number(data[0].total_count) || 0;
        pagination.setTotalCount(totalCount);
        
        // Map to AdminUser interface
        setUsers(data.map((row: Record<string, unknown>) => ({
          id: row.id as string,
          email: row.email as string | null,
          profile_name: row.profile_name as string | null,
          email_verified: row.email_verified as boolean | null,
          created_at: row.created_at as string,
          last_activity_at: row.last_activity_at as string | null,
          plan: row.plan as string | null,
          subscription_status: row.subscription_status as string | null,
          tokens_remaining: row.tokens_remaining as number | null,
          tokens_total: row.tokens_total as number | null,
          is_admin: row.is_admin as boolean,
          is_mod_exempt: row.is_mod_exempt as boolean,
        })));
      } else {
        setUsers([]);
        pagination.setTotalCount(0);
      }
    } catch (err) {
      console.error('Error fetching admin users:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, filters, sortColumn, sortDirection, pagination.from]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    setIsLoadingStats(true);
    
    try {
      const { data, error: statsError } = await supabase.rpc('get_admin_user_stats');

      if (statsError) throw statsError;

      if (data && data.length > 0) {
        setStats({
          total_users: Number(data[0].total_users) || 0,
          active_users: Number(data[0].active_users) || 0,
          admin_count: Number(data[0].admin_count) || 0,
          verified_users: Number(data[0].verified_users) || 0,
          freemium_users: Number(data[0].freemium_users) || 0,
          premium_users: Number(data[0].premium_users) || 0,
          pro_users: Number(data[0].pro_users) || 0,
        });
      }
    } catch (err) {
      console.error('Error fetching user stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // Toggle sort
  const handleSort = useCallback((column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
    // Reset to first page on sort change
    pagination.firstPage();
  }, [sortColumn, pagination]);

  // Update filter
  const updateFilter = useCallback((key: keyof UserFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    // Reset to first page on filter change
    pagination.firstPage();
  }, [pagination]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setFilters({
      plan: '',
      status: '',
      role: '',
      emailVerified: '',
    });
    pagination.firstPage();
  }, [pagination]);

  // Export users to CSV
  const exportToCSV = useCallback(async () => {
    try {
      // Fetch all matching users (up to 10k for export)
      const { data, error: queryError } = await supabase.rpc('search_admin_users', {
        search_term: debouncedSearch || undefined,
        filter_plan: filters.plan || undefined,
        filter_status: filters.status || undefined,
        filter_role: filters.role || undefined,
        filter_email_verified: filters.emailVerified === '' ? undefined : filters.emailVerified === 'true',
        sort_column: sortColumn,
        sort_direction: sortDirection,
        page_offset: 0,
        page_limit: 10000,
      });

      if (queryError) throw queryError;

      if (!data || data.length === 0) {
        return { success: false, message: 'No users to export' };
      }

      // Generate CSV
      const headers = ['ID', 'Email', 'Profile Name', 'Plan', 'Status', 'Credits', 'Role', 'Email Verified', 'Last Active', 'Joined'];
      const rows = data.map((user: Record<string, unknown>) => [
        user.id,
        user.email || '',
        user.profile_name || '',
        user.plan || 'freemium',
        user.subscription_status || 'active',
        Number(user.tokens_remaining || 0).toFixed(2),
        user.is_admin ? 'Admin' : 'User',
        user.email_verified ? 'Yes' : 'No',
        user.last_activity_at ? new Date(user.last_activity_at as string).toISOString() : '',
        new Date(user.created_at as string).toISOString(),
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return { success: true, count: data.length };
    } catch (err) {
      console.error('Error exporting users:', err);
      return { success: false, message: err instanceof Error ? err.message : 'Export failed' };
    }
  }, [debouncedSearch, filters, sortColumn, sortDirection]);

  // Refresh data
  const refresh = useCallback(() => {
    fetchUsers();
    fetchStats();
  }, [fetchUsers, fetchStats]);

  // Initial fetch and refetch on dependency changes
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    users,
    stats,
    isLoading,
    isLoadingStats,
    error,
    searchTerm,
    setSearchTerm,
    filters,
    updateFilter,
    clearFilters,
    sortColumn,
    sortDirection,
    handleSort,
    pagination,
    exportToCSV,
    refresh,
  };
}
