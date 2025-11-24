import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, Clock, CheckCircle, XCircle, AlertCircle, Coins, Sparkles, TrendingUp, Video, Image as ImageIcon, Music, FileText, DollarSign, TrendingDown, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { profileUpdateSchema } from "@/lib/validation-schemas";
import { cn } from "@/lib/utils";
import { useTokenUsage } from "@/hooks/useTokenUsage";
import { TokenUsageHistoryModal } from "@/components/TokenUsageHistoryModal";
import { useConfetti } from "@/hooks/useConfetti";
import { Progress } from "@/components/ui/progress";
import { differenceInMonths } from "date-fns";
import { clearAllCaches } from "@/utils/cacheManagement";
import { NotificationPreferences } from "@/components/settings/NotificationPreferences";
import { logger } from "@/lib/logger";
import { useErrorHandler } from "@/hooks/useErrorHandler";

const Settings = () => {
  const { user } = useAuth();
  const { execute } = useErrorHandler();
  const location = useLocation();
  const defaultTab = (location.state as any)?.defaultTab || 'profile';
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: "",
    phone_number: "",
    zipcode: "",
    email_verified: false,
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [generations, setGenerations] = useState<any[]>([]);
  const [loadingGenerations, setLoadingGenerations] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [userCreatedAt, setUserCreatedAt] = useState<Date | null>(null);
  const confetti = useConfetti();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);

  const {
    currentMonth,
    isLoadingCurrent,
    allTime,
    isLoadingAllTime,
    refetchAllTime
  } = useTokenUsage();

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

  // Plan pricing mapping
  const getPlanPrice = (plan: string): number => {
    const prices: Record<string, number> = {
      freemium: 0,
      explorer: 29,
      professional: 59,
      enterprise: 149,
    };
    return prices[plan?.toLowerCase()] || 0;
  };

  // Calculate savings
  const calculateSavings = () => {
    if (!subscription || !userCreatedAt) return null;

    const competitorTotal = 87; // Runway $35 + Midjourney $30 + ElevenLabs $22
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

  // Trigger confetti on first view
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

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    setLoading(true);

    try {
      await execute(
        async () => {
          // Validate inputs
          const result = profileUpdateSchema.safeParse({
            full_name: profileData.full_name,
            phoneNumber: profileData.phone_number,
            zipcode: profileData.zipcode,
          });

          if (!result.success) {
            const errors: Record<string, string> = {};
            result.error.errors.forEach((err) => {
              if (err.path[0]) {
                errors[err.path[0].toString()] = err.message;
              }
            });
            setValidationErrors(errors);
            setLoading(false);
            return;
          }

          const { error } = await supabase
            .from("profiles")
            .update({
              full_name: profileData.full_name,
              phone_number: profileData.phone_number,
              zipcode: profileData.zipcode,
            })
            .eq("id", user?.id);

          if (error) throw error;

          // Log profile update
          try {
            await supabase.functions.invoke('audit-log', {
              body: {
                action: 'profile_updated',
                resource_type: 'profile',
                resource_id: user?.id,
                metadata: {
                  updated_fields: ['full_name', 'phone_number', 'zipcode']
                }
              }
            });
          } catch (logError) {
            logger.error('Failed to log audit event', logError instanceof Error ? logError : new Error(String(logError)), {
              component: 'Settings',
              operation: 'profile_update_audit',
              userId: user?.id
            });
          }

          // Track activity
          try {
            const { clientLogger } = await import('@/lib/logging/client-logger');
            await clientLogger.activity({
              activityType: 'settings',
              activityName: 'profile_updated',
              routeName: 'Settings',
              description: 'Updated profile settings',
              metadata: {
                fields_changed: Object.keys({ full_name: profileData.full_name, phone_number: profileData.phone_number, zipcode: profileData.zipcode }),
              },
            });
          } catch (trackError) {
            logger.error('Failed to track activity', trackError instanceof Error ? trackError : new Error(String(trackError)), {
              component: 'Settings',
              operation: 'profile_update_activity',
              userId: user?.id
            });
          }
        },
        {
          successMessage: "Profile updated successfully!",
          errorMessage: "Failed to update profile",
          context: {
            component: 'Settings',
            operation: 'handleUpdateProfile',
            userId: user?.id
          }
        }
      );
    } finally {
      setLoading(false);
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
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 gap-1">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="subscription">Subscription</TabsTrigger>
            <TabsTrigger value="usage">Credit Usage</TabsTrigger>
            <TabsTrigger value="history">Generation Logs</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Manage your personal information and verification status</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">First Name</Label>
                      <Input
                        id="first_name"
                        value={profileData.full_name?.split(' ')[0] || ''}
                        onChange={(e) => {
                          const lastName = profileData.full_name?.split(' ').slice(1).join(' ') || '';
                          setProfileData({ ...profileData, full_name: `${e.target.value} ${lastName}`.trim() });
                          setValidationErrors(prev => ({ ...prev, full_name: "" }));
                        }}
                        placeholder="John"
                        aria-label="First name"
                        className={cn(validationErrors.full_name && "border-red-500")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Last Name</Label>
                      <Input
                        id="last_name"
                        value={profileData.full_name?.split(' ').slice(1).join(' ') || ''}
                        onChange={(e) => {
                          const firstName = profileData.full_name?.split(' ')[0] || '';
                          setProfileData({ ...profileData, full_name: `${firstName} ${e.target.value}`.trim() });
                          setValidationErrors(prev => ({ ...prev, full_name: "" }));
                        }}
                        placeholder="Doe"
                        aria-label="Last name"
                        className={cn(validationErrors.full_name && "border-red-500")}
                      />
                    </div>
                  </div>
                  {validationErrors.full_name && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.full_name}
                    </p>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        value={user?.email || ''}
                        disabled
                        aria-label="Email address"
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zipcode">Zipcode</Label>
                      <Input
                        id="zipcode"
                        value={profileData.zipcode}
                        onChange={(e) => {
                          setProfileData({ ...profileData, zipcode: e.target.value });
                          setValidationErrors(prev => ({ ...prev, zipcode: "" }));
                        }}
                        placeholder="12345"
                        aria-label="Zipcode"
                        className={cn(validationErrors.zipcode && "border-red-500")}
                      />
                      {validationErrors.zipcode && (
                        <p className="text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {validationErrors.zipcode}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone_number">Phone Number</Label>
                    <Input
                      id="phone_number"
                      value={profileData.phone_number}
                      onChange={(e) => {
                        setProfileData({ ...profileData, phone_number: e.target.value });
                        setValidationErrors(prev => ({ ...prev, phoneNumber: "" }));
                      }}
                      placeholder="+1234567890"
                      aria-label="Phone number"
                      className={cn(validationErrors.phoneNumber && "border-red-500")}
                    />
                    {validationErrors.phoneNumber && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.phoneNumber}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Label>Verification Status:</Label>
                    <Badge variant={profileData.email_verified ? "default" : "secondary"}>
                      {profileData.email_verified ? "Verified" : "Not Verified"}
                    </Badge>
                  </div>
                  <Button type="submit" disabled={loading} aria-label="Save profile changes">
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Advanced/Developer Section */}
            <Card>
              <CardHeader>
                <CardTitle>Advanced Settings</CardTitle>
                <CardDescription>Developer tools and cache management</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg border">
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm mb-1">Clear All Caches</h4>
                      <p className="text-xs text-muted-foreground mb-3">
                        This will clear all cached data, unregister service workers, and reload the page. 
                        Use this if you're experiencing issues with outdated content.
                      </p>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={async () => {
                          try {
                            await clearAllCaches();
                          } catch {
                            toast.error("Failed to clear caches");
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear All Caches
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="subscription" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Subscription & Tokens</CardTitle>
                <CardDescription>Manage your subscription and view token usage</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {subscription && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Current Plan</Label>
                        <div className="flex items-center gap-2">
                          <Badge className="text-base px-4 py-1 capitalize">{subscription.plan}</Badge>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <div className="flex items-center gap-2">
                          <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'} className="text-base px-4 py-1 capitalize">
                            {subscription.status}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-card rounded-lg border-[3px] border-primary">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-muted-foreground">Credits Remaining</p>
                            <p className="text-3xl font-black text-foreground">{Number(subscription.tokens_remaining).toFixed(2)}</p>
                          </div>
                          <Coins className="h-8 w-8 text-primary" />
                        </div>
                      </div>
                      <div className="p-4 bg-card rounded-lg border-[3px] border-secondary">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-muted-foreground">Total Credits</p>
                            <p className="text-3xl font-black text-foreground">{subscription.tokens_total.toLocaleString()}</p>
                          </div>
                          <Sparkles className="h-8 w-8 text-secondary" />
                        </div>
                      </div>
                    </div>

                    {subscription.current_period_end && (
                      <div className="space-y-2">
                        <Label>Next Billing Date</Label>
                        <p className="text-sm">{new Date(subscription.current_period_end).toLocaleDateString()}</p>
                      </div>
                    )}
                  </>
                )}
                
                <Link to="/pricing">
                  <Button className="w-full bg-secondary hover:bg-secondary/90 text-black font-bold" aria-label="View all pricing plans">
                    Upgrade Plan
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Your Savings Card */}
            {savings && savings.monthlySavings > 0 && (
              <Card className="border-2 border-green-500/30 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <DollarSign className="h-6 w-6" />
                    Your Savings
                  </CardTitle>
                  <CardDescription>See how much you're saving with Artifio</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Big Savings Number */}
                  <div className="text-center p-6 bg-white/50 dark:bg-black/20 rounded-lg border-2 border-green-500/30">
                    <p className="text-sm font-semibold text-muted-foreground mb-2">
                      You're Saving
                    </p>
                    <p className="text-5xl font-black text-green-600 dark:text-green-400 mb-1">
                      ${savings.monthlySavings}
                    </p>
                    <p className="text-lg font-bold text-green-700 dark:text-green-500">
                      per month
                    </p>
                  </div>

                  {/* Comparison Breakdown */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">
                      Competitor Pricing
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-card rounded-lg border">
                        <span className="text-sm font-semibold">Runway ML</span>
                        <span className="font-mono text-sm text-muted-foreground">$35/mo</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-card rounded-lg border">
                        <span className="text-sm font-semibold">Midjourney</span>
                        <span className="font-mono text-sm text-muted-foreground">$30/mo</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-card rounded-lg border">
                        <span className="text-sm font-semibold">ElevenLabs</span>
                        <span className="font-mono text-sm text-muted-foreground">$22/mo</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/30 rounded-lg border-2 border-red-300 dark:border-red-800">
                        <span className="text-sm font-bold">Total Competitor Cost</span>
                        <span className="font-mono text-lg font-black text-red-700 dark:text-red-400">
                          ${savings.competitorTotal}/mo
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-100 dark:from-green-950/30 dark:to-emerald-900/30 rounded-lg border-2 border-green-500">
                        <div className="flex items-center gap-2">
                          <TrendingDown className="h-4 w-4 text-green-600 dark:text-green-400" />
                          <span className="text-sm font-bold">Your Artifio Plan</span>
                        </div>
                        <span className="font-mono text-lg font-black text-green-700 dark:text-green-400">
                          ${savings.userPlanPrice}/mo
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-muted-foreground">Your Plan vs Competitors</span>
                      <span className="font-bold text-green-600 dark:text-green-400">
                        {savings.savingsPercentage.toFixed(0)}% savings
                      </span>
                    </div>
                    <Progress 
                      value={100 - savings.savingsPercentage} 
                      className="h-3 bg-red-200 dark:bg-red-950"
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Your cost: ${savings.userPlanPrice}</span>
                      <span>Competitors: ${savings.competitorTotal}</span>
                    </div>
                  </div>

                  {/* Total Savings Since Signup */}
                  <div className="p-4 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-950/40 dark:to-emerald-950/40 rounded-lg border-2 border-green-500/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide">
                          Total Saved Since Signup
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {savings.monthsAsMember} month{savings.monthsAsMember !== 1 ? 's' : ''} as a member
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-black text-green-600 dark:text-green-400">
                          ${savings.totalSavings}
                        </p>
                        <p className="text-xs text-muted-foreground">and counting!</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="usage" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Credit Usage</CardTitle>
                <CardDescription>Track your credit consumption and creation statistics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Current Balance */}
                <div className="text-center p-8 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border-2 border-primary/30">
                  <p className="text-sm font-semibold text-primary uppercase tracking-wide mb-2">
                    Current Credit Balance
                  </p>
                  <p className="text-6xl font-black text-foreground mb-2">
                    {Number(subscription?.tokens_remaining || 0).toFixed(2)}
                  </p>
                  <p className="text-sm text-primary flex items-center justify-center gap-1">
                    <Sparkles className="h-4 w-4" />
                    Credits never expire
                  </p>
                </div>

                {/* This Month's Statistics */}
                <div>
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    This Month's Activity
                  </h3>
                  
                  {isLoadingCurrent ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : currentMonth ? (
                    <div className="space-y-4">
                      {/* Summary Stats */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-card rounded-lg border">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Total Creations
                          </p>
                          <p className="text-3xl font-black text-foreground mt-1">
                            {currentMonth.totalCreations}
                          </p>
                        </div>
                        <div className="p-4 bg-card rounded-lg border">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Credits Used
                          </p>
                          <p className="text-3xl font-black text-foreground mt-1">
                            {currentMonth.totalTokens.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Breakdown by Type */}
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                          Breakdown by Type
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="p-3 bg-card rounded-lg border">
                            <div className="flex items-center gap-2 mb-2">
                              <Video className="h-4 w-4 text-primary" />
                              <span className="text-xs font-semibold">Videos</span>
                            </div>
                            <p className="text-xl font-black">{currentMonth.byType.video.count}</p>
                            <p className="text-xs text-muted-foreground">
                              {currentMonth.byType.video.tokens} tokens
                            </p>
                          </div>
                          <div className="p-3 bg-card rounded-lg border">
                            <div className="flex items-center gap-2 mb-2">
                              <ImageIcon className="h-4 w-4 text-secondary" />
                              <span className="text-xs font-semibold">Images</span>
                            </div>
                            <p className="text-xl font-black">{currentMonth.byType.image.count}</p>
                            <p className="text-xs text-muted-foreground">
                              {currentMonth.byType.image.tokens} tokens
                            </p>
                          </div>
                          <div className="p-3 bg-card rounded-lg border">
                            <div className="flex items-center gap-2 mb-2">
                              <Music className="h-4 w-4 text-accent" />
                              <span className="text-xs font-semibold">Audio</span>
                            </div>
                            <p className="text-xl font-black">{currentMonth.byType.audio.count}</p>
                            <p className="text-xs text-muted-foreground">
                              {currentMonth.byType.audio.tokens} tokens
                            </p>
                          </div>
                          <div className="p-3 bg-card rounded-lg border">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="text-xs font-semibold">Text</span>
                            </div>
                            <p className="text-xl font-black">{currentMonth.byType.text.count}</p>
                            <p className="text-xs text-muted-foreground">
                              {currentMonth.byType.text.tokens} tokens
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Most Used Model */}
                      {currentMonth.mostUsedModel && (
                        <div className="p-4 bg-accent/10 rounded-lg border border-accent">
                          <p className="text-xs font-semibold text-accent-foreground uppercase tracking-wide mb-2">
                            Most Used AI Model
                          </p>
                          <p className="text-lg font-bold">{currentMonth.mostUsedModel.model_id}</p>
                          <p className="text-sm text-muted-foreground">
                            Used {currentMonth.mostUsedModel.count} time{currentMonth.mostUsedModel.count !== 1 ? 's' : ''} this month
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No usage data for this month yet. Start creating!
                    </p>
                  )}
                </div>

                {/* View Full History Button */}
                <Button
                  onClick={() => {
                    refetchAllTime();
                    setShowHistoryModal(true);
                  }}
                  className="w-full bg-secondary hover:bg-secondary/90 text-black font-bold"
                  size="lg"
                >
                  View Full History
                </Button>
              </CardContent>
            </Card>
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

        {/* Token Usage History Modal */}
        <TokenUsageHistoryModal
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          allTimeStats={allTime}
          isLoading={isLoadingAllTime}
          generations={generations}
        />
      </div>
    </div>
  );
};

export default Settings;