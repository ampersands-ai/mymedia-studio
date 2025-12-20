import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationPreferences } from "@/components/settings/NotificationPreferences";
import { ProfileSection } from "@/components/settings/ProfileSection";
import { SubscriptionSection } from "@/components/settings/SubscriptionSection";
import { AccountSection } from "@/components/settings/AccountSection";
import { useErrorHandler } from "@/hooks/useErrorHandler";

const Settings = () => {
  const { user } = useAuth();
  const { execute } = useErrorHandler();
  const location = useLocation();
  const defaultTab = (location.state as {defaultTab?: string})?.defaultTab || 'profile';
  const [profileData, setProfileData] = useState({
    profile_name: "",
    email_verified: false,
  });
  
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    document.title = "Settings - Artifio.ai";
    if (user) {
      fetchProfile();
      fetchSubscription();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);


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
            profile_name: data.profile_name || "",
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
          <TabsList className="grid w-full grid-cols-4 gap-1">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4 mt-6">
            <ProfileSection profileData={profileData} setProfileData={setProfileData} />
          </TabsContent>

          <TabsContent value="billing" className="space-y-4 mt-6">
            <SubscriptionSection subscription={subscription} />
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4 mt-6">
            <NotificationPreferences />
          </TabsContent>

          <TabsContent value="account" className="space-y-4 mt-6">
            <AccountSection />
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
};

export default Settings;
