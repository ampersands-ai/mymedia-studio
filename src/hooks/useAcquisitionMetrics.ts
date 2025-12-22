import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CohortMetric {
  cohort_month: string;
  cohort_size: number;
  activated_users: number;
  converted_users: number;
  active_last_30d: number;
  conversion_rate_pct: number;
}

interface FeatureAdoptionMetric {
  feature_type: string;
  total_generations: number;
  unique_users: number;
  users_last_30d: number;
  avg_tokens_per_generation: number;
  total_tokens_consumed: number;
}

interface TokenEconomicsMetric {
  plan: string;
  user_count: number;
  total_tokens_issued: number;
  total_tokens_remaining: number;
  total_tokens_consumed: number;
  avg_tokens_consumed_per_user: number;
  consumption_rate_pct: number;
}

interface ChannelMetric {
  source: string;
  medium: string;
  campaign: string;
  signup_method: string;
  signups: number;
  activated: number;
  converted: number;
  conversion_rate_pct: number;
}

interface ReferralMetric {
  referrer_id: string;
  referrer_name: string | null;
  code: string;
  total_referrals: number;
  successful_referrals: number;
  tokens_earned: number;
  is_active: boolean;
  created_at: string;
}

interface ChurnRiskIndicator {
  user_id: string;
  display_name: string | null;
  plan: string;
  tokens_remaining: number;
  tokens_total: number;
  last_activity_at: string | null;
  days_since_activity: number;
  total_generations: number;
  generations_last_30d: number;
  churn_risk: 'high' | 'medium' | 'low';
}

// Hook for cohort retention metrics
export function useCohortMetrics() {
  return useQuery({
    queryKey: ['acquisition-cohort-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('acquisition_cohort_metrics')
        .select('*')
        .order('cohort_month', { ascending: false });
      
      if (error) throw error;
      return data as CohortMetric[];
    },
  });
}

// Hook for feature adoption metrics
export function useFeatureAdoptionMetrics() {
  return useQuery({
    queryKey: ['feature-adoption-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_adoption_metrics')
        .select('*')
        .order('total_generations', { ascending: false });
      
      if (error) throw error;
      return data as FeatureAdoptionMetric[];
    },
  });
}

// Hook for token economics metrics
export function useTokenEconomicsMetrics() {
  return useQuery({
    queryKey: ['token-economics-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('token_economics_metrics')
        .select('*')
        .order('user_count', { ascending: false });
      
      if (error) throw error;
      return data as TokenEconomicsMetric[];
    },
  });
}

// Hook for acquisition channel metrics
export function useChannelMetrics() {
  return useQuery({
    queryKey: ['acquisition-channel-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('acquisition_channel_metrics')
        .select('*')
        .order('signups', { ascending: false });
      
      if (error) throw error;
      return data as ChannelMetric[];
    },
  });
}

// Hook for referral program metrics
export function useReferralProgramMetrics() {
  return useQuery({
    queryKey: ['referral-program-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referral_program_metrics')
        .select('*')
        .order('total_referrals', { ascending: false });
      
      if (error) throw error;
      return data as ReferralMetric[];
    },
  });
}

// Hook for churn risk indicators
export function useChurnRiskIndicators(riskLevel?: 'high' | 'medium' | 'low') {
  return useQuery({
    queryKey: ['churn-risk-indicators', riskLevel],
    queryFn: async () => {
      let query = supabase
        .from('churn_risk_indicators')
        .select('*')
        .order('days_since_activity', { ascending: false });
      
      if (riskLevel) {
        query = query.eq('churn_risk', riskLevel);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as ChurnRiskIndicator[];
    },
  });
}

// Combined hook for all acquisition metrics (admin dashboard)
export function useAllAcquisitionMetrics() {
  const cohort = useCohortMetrics();
  const features = useFeatureAdoptionMetrics();
  const tokenEconomics = useTokenEconomicsMetrics();
  const channels = useChannelMetrics();
  const referrals = useReferralProgramMetrics();
  const churnRisk = useChurnRiskIndicators();

  return {
    cohort: cohort.data || [],
    features: features.data || [],
    tokenEconomics: tokenEconomics.data || [],
    channels: channels.data || [],
    referrals: referrals.data || [],
    churnRisk: churnRisk.data || [],
    isLoading: cohort.isLoading || features.isLoading || tokenEconomics.isLoading || 
               channels.isLoading || referrals.isLoading || churnRisk.isLoading,
    isError: cohort.isError || features.isError || tokenEconomics.isError || 
             channels.isError || referrals.isError || churnRisk.isError,
  };
}
