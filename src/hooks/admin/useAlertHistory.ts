import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AlertHistoryItem {
  id: string;
  alert_type: string;
  severity: string;
  trigger_value: number;
  threshold_value: number;
  message: string;
  channels_sent: string[];
  channels_failed: string[];
  recipients: string[];
  is_resolved: boolean;
  resolved_at: string | null;
  resolution_notes: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

interface AlertHistoryFilters {
  alertType?: string;
  severity?: string;
  isResolved?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

export const useAlertHistory = (filters: AlertHistoryFilters = {}) => {
  const queryClient = useQueryClient();

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['alert-history', filters],
    queryFn: async () => {
      let query = supabase
        .from('webhook_alert_history')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.alertType) {
        query = query.eq('alert_type', filters.alertType);
      }
      if (filters.severity) {
        query = query.eq('severity', filters.severity);
      }
      if (filters.isResolved !== undefined) {
        query = query.eq('is_resolved', filters.isResolved);
      }
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as AlertHistoryItem[];
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const resolveAlert = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { error } = await supabase
        .from('webhook_alert_history')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          resolution_notes: notes || null,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-history'] });
      toast.success('Alert marked as resolved');
    },
    onError: (error) => {
      toast.error('Failed to resolve alert: ' + error.message);
    },
  });

  return {
    alerts: alerts || [],
    isLoading,
    resolveAlert: resolveAlert.mutate,
    isResolving: resolveAlert.isPending,
  };
};

export const useAlertStats = (days = 7) => {
  return useQuery({
    queryKey: ['alert-stats', days],
    queryFn: async () => {
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);

      const { data, error } = await supabase
        .from('webhook_alert_history')
        .select('*')
        .gte('created_at', dateFrom.toISOString());

      if (error) throw error;

      const alerts = data as AlertHistoryItem[];

      // Calculate stats
      const totalAlerts = alerts.length;
      const resolvedAlerts = alerts.filter(a => a.is_resolved).length;
      const unresolvedAlerts = totalAlerts - resolvedAlerts;
      
      const avgResolutionTime = alerts
        .filter(a => a.resolved_at)
        .reduce((acc, alert) => {
          const created = new Date(alert.created_at).getTime();
          const resolved = new Date(alert.resolved_at!).getTime();
          return acc + (resolved - created);
        }, 0) / resolvedAlerts || 0;

      // Group by type
      const byType = alerts.reduce((acc, alert) => {
        acc[alert.alert_type] = (acc[alert.alert_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Group by severity
      const bySeverity = alerts.reduce((acc, alert) => {
        acc[alert.severity] = (acc[alert.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Trend data (daily)
      const trendData = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const dayAlerts = alerts.filter(a => {
          const alertDate = new Date(a.created_at);
          return alertDate >= date && alertDate < nextDate;
        });

        trendData.push({
          date: date.toISOString().split('T')[0],
          total: dayAlerts.length,
          critical: dayAlerts.filter(a => a.severity === 'critical').length,
          warning: dayAlerts.filter(a => a.severity === 'warning').length,
          info: dayAlerts.filter(a => a.severity === 'info').length,
        });
      }

      return {
        totalAlerts,
        resolvedAlerts,
        unresolvedAlerts,
        avgResolutionTime,
        byType,
        bySeverity,
        trendData,
      };
    },
    refetchInterval: 60000, // Refetch every minute
  });
};
