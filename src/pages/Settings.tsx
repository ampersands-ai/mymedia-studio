import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { differenceInMonths } from "date-fns";
import { NotificationPreferences } from "@/components/settings/NotificationPreferences";
import { ProfileSection } from "@/components/settings/ProfileSection";
import { SubscriptionSection } from "@/components/settings/SubscriptionSection";
import { useConfetti } from "@/hooks/useConfetti";
import { useErrorHandler } from "@/hooks/useErrorHandler";

const Settings = () => {
  const { user } = useAuth();
  const { execute } = useErrorHandler();
  const location = useLocation();
  const defaultTab = (location.state as {defaultTab?: string})?.defaultTab || 'profile';
  const [profileData, setProfileData] = useState({
    full_name: "",
    phone_number: "",
    zipcode: "",
    email_verified: false,
  });
  
  const [subscription, setSubscription] = useState<any>(null);
  const [userCreatedAt, setUserCreatedAt] = useState<Date | null>(null);
  const confetti = useConfetti();

  useEffect(() => {
    document.title = "Settings - Artifio.ai";
    if (user) {
      fetchProfile();
      fetchSubscription();
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

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-4xl font-black gradient-text mb-8">Settings</h1>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 gap-1">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4 mt-6">
            <ProfileSection profileData={profileData} setProfileData={setProfileData} />
          </TabsContent>

          <TabsContent value="billing" className="space-y-4 mt-6">
            <SubscriptionSection
              subscription={subscription}
              savings={savings}
            />
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
