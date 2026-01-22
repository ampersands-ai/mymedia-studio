/**
 * useGenerationLedger Hook
 * 
 * Fetches generation ledger data for admin dashboard.
 * Provides filtering, pagination, and real-time updates.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useCallback } from 'react';

export interface GenerationLedgerEntry {
  artifio_id: string;
  user_id: string;
  user_email: string | null;
  user_name: string | null;
  provider_task_id: string | null;
  model_id: string | null;
  model_record_id: string | null;
  content_type: string | null;
  status: string | null;
  credits_cost: number;
  tokens_charged: number;
  has_output: boolean;
  run_date: string;
  completed_at: string | null;
  total_duration_ms: number;
  setup_duration_ms: number | null;
  api_duration_ms: number | null;
  prompt: string | null;
  output_url: string | null;
  storage_path: string | null;
  running_balance?: number;
  [key: string]: unknown; // Index signature for Record compatibility
}

export interface LedgerFilters {
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
  userEmail?: string;
  status?: string;
  contentType?: string;
  hasOutput?: boolean | null;
  modelId?: string;
}

interface UseGenerationLedgerOptions {
  filters?: LedgerFilters;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}

export function useGenerationLedger(options: UseGenerationLedgerOptions = {}) {
  const { 
    filters = {}, 
    page = 0, 
    pageSize = 50, 
    enabled = true 
  } = options;

  const [totalCount, setTotalCount] = useState(0);

  const fetchLedger = useCallback(async () => {
    // Build the query - using generations table directly since view may not be in types
    let query = supabase
      .from('generations')
      .select(`
        id,
        user_id,
        provider_task_id,
        model_id,
        model_record_id,
        type,
        status,
        tokens_used,
        tokens_charged,
        output_url,
        storage_path,
        created_at,
        completed_at,
        setup_duration_ms,
        api_duration_ms,
        prompt,
        profiles!generations_user_id_fkey (
          email,
          display_name
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }
    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters.contentType && filters.contentType !== 'all') {
      query = query.eq('type', filters.contentType);
    }
    if (filters.hasOutput === true) {
      query = query.or('output_url.not.is.null,storage_path.not.is.null');
    } else if (filters.hasOutput === false) {
      query = query.is('output_url', null).is('storage_path', null);
    }
    if (filters.modelId) {
      query = query.ilike('model_id', `%${filters.modelId}%`);
    }

    // Apply pagination
    const from = page * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    if (count !== null) {
      setTotalCount(count);
    }

    // Transform to ledger format
    type GenRow = typeof data extends (infer T)[] | null ? T : never;
    const entries: GenerationLedgerEntry[] = (data || []).map((g: GenRow) => {
      const profile = g.profiles as { email?: string; display_name?: string } | null;
      return {
        artifio_id: g.id,
        user_id: g.user_id,
        user_email: profile?.email || null,
        user_name: profile?.display_name || null,
        provider_task_id: g.provider_task_id,
        model_id: g.model_id,
        model_record_id: g.model_record_id,
        content_type: g.type,
        status: g.status,
        credits_cost: g.tokens_used || 0,
        tokens_charged: g.tokens_charged || 0,
        has_output: !!(g.output_url || g.storage_path),
        run_date: g.created_at,
        completed_at: g.completed_at,
        total_duration_ms: (g.setup_duration_ms || 0) + (g.api_duration_ms || 0),
        setup_duration_ms: g.setup_duration_ms,
        api_duration_ms: g.api_duration_ms,
        prompt: g.prompt,
        output_url: g.output_url,
        storage_path: g.storage_path,
      };
    });

    return entries;
  }, [filters, page, pageSize]);

  const query = useQuery({
    queryKey: ['generation-ledger', filters, page, pageSize],
    queryFn: fetchLedger,
    enabled,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  return {
    ...query,
    totalCount,
    totalPages: Math.ceil(totalCount / pageSize),
    currentPage: page,
    pageSize,
  };
}
