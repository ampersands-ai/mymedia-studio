import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationPreferences } from "@/components/settings/NotificationPreferences";
import { ProfileSection } from "@/components/settings/ProfileSection";
import { SubscriptionSection } from "@/components/settings/SubscriptionSection";
import { AccountSection } from "@/components/settings/AccountSection";
import { AppCacheSection } from "@/components/settings/AppCacheSection";
import { CreditActivityLog } from "@/components/credits/CreditActivityLog";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { useUserTokens } from "@/hooks/useUserTokens";

const Settings = () => {
  const { user } = useAuth();
  const { execute } = useErrorHandler();
  const location = useLocation();
  
  // Check URL query param first, then location state, then default to 'profile'
  const searchParams = new URLSearchParams(location.search);
  const tabFromQuery = searchParams.get('tab');
  const tabFromState = (location.state as {defaultTab?: string})?.defaultTab;
  const [activeTab, setActiveTab] = useState(tabFromQuery || tabFromState || 'profile');
  const [profileData, setProfileData] = useState({
    display_name: "",
    email_verified: false,
  });
  
  // Update active tab when URL changes
  useEffect(() => {
    const newTab = tabFromQuery || tabFromState || 'profile';
    setActiveTab(newTab);
  }, [tabFromQuery, tabFromState]);
  
  // Use react-query hook for subscription data - auto-updates when invalidated
  const { data: userTokenData } = useUserTokens();
  
  // Build subscription object from the hook data
  const subscription = userTokenData ? {
    plan: userTokenData.plan || 'freemium',
    status: 'active',
    tokens_remaining: userTokenData.tokens_remaining || 0,
    tokens_total: userTokenData.tokens_total || 0,
    current_period_end: userTokenData.current_period_end,
  } : null;

  useEffect(() => {
    document.title = "Settings - Artifio.ai";
    if (user) {
      fetchProfile();
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
            display_name: data.display_name || "",
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

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-4xl font-black gradient-text mb-8">Settings</h1>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <TabsList className="flex w-max gap-2 pb-1">
              <TabsTrigger value="profile" className="flex-shrink-0 px-4">Profile</TabsTrigger>
              <TabsTrigger value="billing" className="flex-shrink-0 px-4">Billing</TabsTrigger>
              <TabsTrigger value="credits" className="flex-shrink-0 px-4">Credits</TabsTrigger>
              <TabsTrigger value="notifications" className="flex-shrink-0 px-4">Notifications</TabsTrigger>
              <TabsTrigger value="account" className="flex-shrink-0 px-4">Account</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="profile" className="space-y-4 mt-6">
            <ProfileSection profileData={profileData} setProfileData={setProfileData} />
          </TabsContent>

          <TabsContent value="billing" className="space-y-4 mt-6">
            <SubscriptionSection subscription={subscription} />
          </TabsContent>

          <TabsContent 
            value="credits" 
            className="space-y-4 mt-6"
            style={{ 
              marginLeft: 'calc(-50vw + 50%)', 
              marginRight: 'calc(-50vw + 50%)', 
              paddingLeft: 'max(1rem, calc(50vw - 600px))',
              paddingRight: 'max(1rem, calc(50vw - 600px))'
            }}
          >
            <CreditActivityLog />
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4 mt-6">
            <NotificationPreferences />
          </TabsContent>

          <TabsContent value="account" className="space-y-4 mt-6">
            <AppCacheSection />
            <AccountSection />
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
};

export default Settings;
