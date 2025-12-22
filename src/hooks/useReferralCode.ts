import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface ReferralCode {
  id: string;
  code: string;
  reward_tokens: number;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

interface ReferralStats {
  total_referrals: number;
  successful_referrals: number;
  tokens_earned: number;
}

export function useReferralCode() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user's referral codes
  const { data: referralCodes, isLoading: isLoadingCodes } = useQuery({
    queryKey: ['referral-codes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ReferralCode[];
    },
    enabled: !!user?.id,
  });

  // Generate a new referral code
  const generateCodeMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .rpc('generate_referral_code', { p_user_id: user.id });
      
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral-codes', user?.id] });
    },
  });

  // Get referral stats
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['referral-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('referral_redemptions')
        .select('referrer_reward_tokens, referrer_rewarded')
        .eq('referrer_user_id', user.id);
      
      if (error) throw error;
      
      type RedemptionRow = { referrer_reward_tokens: number | null; referrer_rewarded: boolean };
      
      const stats: ReferralStats = {
        total_referrals: data.length,
        successful_referrals: data.filter((r: RedemptionRow) => r.referrer_rewarded).length,
        tokens_earned: data
          .filter((r: RedemptionRow) => r.referrer_rewarded)
          .reduce((sum: number, r: RedemptionRow) => sum + (r.referrer_reward_tokens || 0), 0),
      };
      
      return stats;
    },
    enabled: !!user?.id,
  });

  // Check if current user was referred
  const { data: wasReferred } = useQuery({
    queryKey: ['was-referred', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      const { data, error } = await supabase
        .from('referral_redemptions')
        .select('id')
        .eq('referred_user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return !!data;
    },
    enabled: !!user?.id,
  });

  return {
    referralCodes: referralCodes || [],
    stats: stats || { total_referrals: 0, successful_referrals: 0, tokens_earned: 0 },
    wasReferred: wasReferred || false,
    isLoading: isLoadingCodes || isLoadingStats,
    generateCode: generateCodeMutation.mutateAsync,
    isGenerating: generateCodeMutation.isPending,
  };
}

// Hook to redeem a referral code (used at signup)
export function useRedeemReferralCode() {
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redeemCode = useCallback(async (code: string, userId: string): Promise<boolean> => {
    setIsRedeeming(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase
        .rpc('redeem_referral_code', { 
          p_code: code.toUpperCase(),
          p_referred_user_id: userId 
        });
      
      if (rpcError) {
        console.error('Referral redemption error:', rpcError);
        setError('Failed to redeem referral code');
        return false;
      }
      
      return data === true;
    } catch (err) {
      console.error('Referral redemption error:', err);
      setError('Failed to redeem referral code');
      return false;
    } finally {
      setIsRedeeming(false);
    }
  }, []);

  return { redeemCode, isRedeeming, error };
}
