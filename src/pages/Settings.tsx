import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Clock, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { differenceInMonths } from "date-fns";
import { NotificationPreferences } from "@/components/settings/NotificationPreferences";
import { ProfileSection } from "@/components/settings/ProfileSection";
import { SubscriptionSection } from "@/components/settings/SubscriptionSection";
import { SecuritySection } from "@/components/settings/SecuritySection";
import { DataSection } from "@/components/settings/DataSection";
import { useConfetti } from "@/hooks/useConfetti";
import { useErrorHandler } from "@/hooks/useErrorHandler";

const Settings = () => {
  const { user } = useAuth();
  const { execute } = useErrorHandler();
  const location = useLocation();
  const defaultTab = (location.state as any)?.defaultTab || 'profile';
  const [profileData, setProfileData] = useState({
    full_name: "",
    phone_number: "",
    zipcode: "",
    email_verified: false,
  });
  const [generations, setGenerations] = useState<any[]>([]);
  const [loadingGenerations, setLoadingGenerations] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [userCreatedAt, setUserCreatedAt] = useState<Date | null>(null);
  const confetti = useConfetti();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);

  useEffect(() => {
    document.title = "Settings - Artifio.ai";
    if (user) {
      fetchProfile();
      fetchGenerations();
      fetchSubscription();
      fetchSessions();
      fetchAuditLogs();
      fetchUserCreatedDate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchUserCreatedDate = async () => {
    await execute(
      async () => {
        const { data, error } = await supabase
          .from("profiles")
          .select("created_at")
          .eq("id", user?.id)
          .maybeSingle();

        if (error) throw error;
        if (data?.created_at) {
          setUserCreatedAt(new Date(data.created_at));
        }
      },
      {
        showSuccessToast: false,
        showErrorToast: false,
        context: {
          component: 'Settings',
          operation: 'fetchUserCreatedDate',
          userId: user?.id
        }
      }
    );
  };

  const getPlanPrice = (plan: string): number => {
    const prices: Record<string, number> = {
      freemium: 0,
      explorer: 29,
      professional: 59,
      enterprise: 149,
    };
    return prices[plan?.toLowerCase()] || 0;
  };

  const calculateSavings = () => {
    if (!subscription || !userCreatedAt) return null;

    const competitorTotal = 87;
    const userPlanPrice = getPlanPrice(subscription.plan);
    const monthlySavings = competitorTotal - userPlanPrice;
    const monthsAsMember = Math.max(1, differenceInMonths(new Date(), userCreatedAt));
    const totalSavings = monthlySavings * monthsAsMember;
    const savingsPercentage = userPlanPrice > 0 ? ((monthlySavings / competitorTotal) * 100) : 100;

    return {
      userPlanPrice,
      competitorTotal,
      monthlySavings,
      totalSavings,
      monthsAsMember,
      savingsPercentage,
    };
  };

  const savings = calculateSavings();

  useEffect(() => {
    if (savings && savings.monthlySavings > 0) {
      const hasSeenSavings = localStorage.getItem('hasSeenSavingsConfetti');
      if (!hasSeenSavings) {
        setTimeout(() => {
          confetti.fireCelebration();
          localStorage.setItem('hasSeenSavingsConfetti', 'true');
        }, 500);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savings]);

  const fetchProfile = async () => {
    await execute(
      async () => {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user?.id)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          setProfileData({
            full_name: data.full_name || "",
            phone_number: data.phone_number || "",
            zipcode: data.zipcode || "",
            email_verified: data.email_verified || false,
          });
        }
      },
      {
        showSuccessToast: false,
        errorMessage: "Failed to load profile data",
        context: {
          component: 'Settings',
          operation: 'fetchProfile',
          userId: user?.id
        }
      }
    );
  };

  const fetchGenerations = async () => {
    setLoadingGenerations(true);
    try {
      await execute(
        async () => {
          const { data, error } = await supabase
            .from("generations")
            .select("*")
            .eq("user_id", user?.id)
            .order("created_at", { ascending: false })
            .limit(20);

          if (error) throw error;
          setGenerations(data || []);
        },
        {
          showSuccessToast: false,
          errorMessage: "Failed to load generation history",
          context: {
            component: 'Settings',
            operation: 'fetchGenerations',
            userId: user?.id
          }
        }
      );
    } finally {
      setLoadingGenerations(false);
    }
  };

  const fetchSubscription = async () => {
    await execute(
      async () => {
        const { data, error } = await supabase
          .from("user_subscriptions")
          .select("*")
          .eq("user_id", user?.id)
          .maybeSingle();

        if (error) throw error;
        setSubscription(data);
      },
      {
        showSuccessToast: false,
        showErrorToast: false,
        context: {
          component: 'Settings',
          operation: 'fetchSubscription',
          userId: user?.id
        }
      }
    );
  };

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      await execute(
        async () => {
          const { data, error } = await supabase.functions.invoke('session-manager', {
            body: { action: 'list' }
          });

          if (error) throw error;
          setSessions(data?.sessions || []);
        },
        {
          showSuccessToast: false,
          showErrorToast: false,
          context: {
            component: 'Settings',
            operation: 'fetchSessions',
            userId: user?.id
          }
        }
      );
    } finally {
      setLoadingSessions(false);
    }
  };

  const fetchAuditLogs = async () => {
    setLoadingAuditLogs(true);
    try {
      await execute(
        async () => {
          const { data, error } = await supabase
            .from("audit_logs")
            .select("*")
            .eq("user_id", user?.id)
            .order("created_at", { ascending: false })
            .limit(20);

          if (error) throw error;
          setAuditLogs(data || []);
        },
        {
          showSuccessToast: false,
          showErrorToast: false,
          context: {
            component: 'Settings',
            operation: 'fetchAuditLogs',
            userId: user?.id
          }
        }
      );
    } finally {
      setLoadingAuditLogs(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" aria-label="Completed" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" aria-label="Failed" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" aria-label="Pending" />;
      default:
        return <Clock className="h-4 w-4" aria-label="Processing" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-4xl font-black gradient-text mb-8">Settings</h1>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-6 gap-1">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="subscription">Subscription</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
            <TabsTrigger value="history">Logs</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4 mt-6">
            <ProfileSection profileData={profileData} setProfileData={setProfileData} />
          </TabsContent>

          <TabsContent value="subscription" className="space-y-4 mt-6">
            <SubscriptionSection
              subscription={subscription}
              savings={savings}
              generations={generations}
            />
          </TabsContent>

          <TabsContent value="security" className="space-y-4 mt-6">
            <SecuritySection
              sessions={sessions}
              loadingSessions={loadingSessions}
              auditLogs={auditLogs}
              loadingAuditLogs={loadingAuditLogs}
            />
          </TabsContent>

          <TabsContent value="data" className="space-y-4 mt-6">
            <DataSection />
          </TabsContent>

          <TabsContent value="history" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Generation Logs</CardTitle>
                <CardDescription>Track token usage across all your generations</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingGenerations ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : generations.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No generations yet. Start creating to see your logs!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {generations.map((gen) => (
                      <div
                        key={gen.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusIcon(gen.status)}
                            <span className="font-semibold capitalize">{gen.type}</span>
                            <Badge variant="outline" className="text-xs">
                              {gen.tokens_used} tokens
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {gen.prompt}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(gen.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4 mt-6">
            <NotificationPreferences />
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
};

export default Settings;
