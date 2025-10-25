import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getReferralStats } from '@/lib/referralUtils';
import type { ReferralStats, ReferralCommission, WithdrawalRequest, UserPixKey } from '@/types';

interface UseReferralDataReturn {
  stats: ReferralStats | null;
  commissions: ReferralCommission[];
  withdrawals: WithdrawalRequest[];
  pixKeys: UserPixKey[];
  referralLink: string;
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
}

export function useReferralData(userId: string | undefined): UseReferralDataReturn {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [commissions, setCommissions] = useState<ReferralCommission[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [pixKeys, setPixKeys] = useState<UserPixKey[]>([]);
  const [referralLink, setReferralLink] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data: user } = await supabase
        .from('users')
        .select('referral_code')
        .eq('id', userId)
        .single();

      if (user?.referral_code) {
        const baseUrl = window.location.origin;
        setReferralLink(`${baseUrl}/register?ref=${user.referral_code}`);
      }

      const referralStats = await getReferralStats(userId);
      setStats(referralStats);

      const { data: commissionsData } = await supabase
        .from('referral_commissions')
        .select(`
          *,
          referred_user:users!referral_commissions_referred_user_id_fkey(name, email),
          subscription:subscriptions(plan_name, status)
        `)
        .eq('referrer_id', userId)
        .order('created_at', { ascending: false });

      setCommissions(commissionsData || []);

      const { data: withdrawalsData } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      setWithdrawals(withdrawalsData || []);

      const { data: pixKeysData } = await supabase
        .from('user_pix_keys')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      setPixKeys(pixKeysData || []);

    } catch (err) {
      console.error('Error fetching referral data:', err);
      setError('Erro ao carregar dados de indicações');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  return {
    stats,
    commissions,
    withdrawals,
    pixKeys,
    referralLink,
    isLoading,
    error,
    refreshData: fetchData
  };
}
