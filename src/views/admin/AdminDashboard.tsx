import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, FileText, Zap, TrendingUp, Users } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { getAllModels } from "@/lib/models/registry";
import { useErrorHandler } from "@/hooks/useErrorHandler";

export default function AdminDashboard() {
  const { execute } = useErrorHandler();
  const [stats, setStats] = useState({
    totalModels: 0,
    activeModels: 0,
    totalTemplates: 0,
    activeTemplates: 0,
    todayGenerations: 0,
    totalGenerations: 0,
    totalStoryboards: 0,
    latestQuotaRemaining: null as number | null,
  });

  const [communityEnabled, setCommunityEnabled] = useState(false);
  const [loadingCommunityToggle, setLoadingCommunityToggle] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      await execute(
        async () => {
          // Fetch models count from registry (not database)
          const allModels = getAllModels();
          const totalModels = allModels.length;
          const activeModels = allModels.filter(m => m.MODEL_CONFIG.isActive).length;

          // Fetch templates count (workflow_templates only - content_templates deleted)
          const { count: totalTemplates } = await supabase
            .from("workflow_templates")
            // @ts-expect-error Supabase types don't include count option overload
            .select("*", { count: "exact", head: true });

          const { count: activeTemplates } = await supabase
            .from("workflow_templates")
            // @ts-expect-error Supabase types don't include count option overload
            .select("*", { count: "exact", head: true })
            .eq("is_active", true);

          // Fetch generations count
          const { count: totalGenerations } = await supabase
            .from("generations")
            // @ts-expect-error Supabase types don't include count option overload
            .select("*", { count: "exact", head: true });

          const today = new Date().toISOString().split("T")[0];
          const { count: todayGenerations } = await supabase
            .from("generations")
            // @ts-expect-error Supabase types don't include count option overload
            .select("*", { count: "exact", head: true })
            .gte("created_at", today);

          // Fetch storyboards count
          const { count: totalStoryboards } = await supabase
            .from("storyboards")
            // @ts-expect-error Supabase types don't include count option overload
            .select("*", { count: "exact", head: true });

          // Fetch latest API quota remaining
          const { data: latestStoryboard } = await supabase
            .from("storyboards")
            .select("api_quota_remaining")
            .not("api_quota_remaining", "is", null)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          // Fetch community settings
          const { data: communitySettings } = await supabase
            .from("app_settings")
            .select("setting_value")
            .eq("setting_key", "community_enabled")
            .single();

          setStats({
            totalModels,
            activeModels,
            totalTemplates: totalTemplates || 0,
            activeTemplates: activeTemplates || 0,
            todayGenerations: todayGenerations || 0,
            totalGenerations: totalGenerations || 0,
            totalStoryboards: totalStoryboards || 0,
            latestQuotaRemaining: latestStoryboard?.api_quota_remaining || null,
          });

          if (communitySettings && typeof communitySettings.setting_value === 'object' && communitySettings.setting_value !== null) {
            setCommunityEnabled((communitySettings.setting_value as { enabled: boolean }).enabled === true);
          }
        },
        {
          showSuccessToast: false,
          errorMessage: "Failed to fetch dashboard stats",
          context: {
            component: 'AdminDashboard',
            operation: 'fetchStats'
          }
        }
      );
    };

    fetchStats();
  }, [execute]);

  const handleCommunityToggle = async (checked: boolean) => {
    setLoadingCommunityToggle(true);
    try {
      await execute(
        async () => {
          const { error } = await supabase
            .from("app_settings")
            .update({
              setting_value: { enabled: checked },
              updated_at: new Date().toISOString()
            })
            .eq("setting_key", "community_enabled");

          if (error) throw error;

          setCommunityEnabled(checked);
        },
        {
          successMessage: `Community ${checked ? 'enabled' : 'disabled'} successfully`,
          errorMessage: "Failed to update community setting",
          context: {
            component: 'AdminDashboard',
            operation: 'handleCommunityToggle',
            checked
          }
        }
      );
    } finally {
      setLoadingCommunityToggle(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-black mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage AI models, templates, and monitor system activity
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="border-3 border-black brutal-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold">AI Models</CardTitle>
            <Database className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{stats.activeModels}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalModels} total
            </p>
          </CardContent>
        </Card>

        <Card className="border-3 border-black brutal-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold">Templates</CardTitle>
            <FileText className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{stats.activeTemplates}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalTemplates} total
            </p>
          </CardContent>
        </Card>

        <Card className="border-3 border-black brutal-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold">Today</CardTitle>
            <Zap className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{stats.todayGenerations}</div>
            <p className="text-xs text-muted-foreground">Generations</p>
          </CardContent>
        </Card>

        <Card className="border-3 border-black brutal-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold">Total</CardTitle>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{stats.totalGenerations}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card className="border-3 border-black brutal-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold">API Quota</CardTitle>
            <Database className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">
              {stats.latestQuotaRemaining !== null ? stats.latestQuotaRemaining : '-'}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.totalStoryboards} storyboards
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-3 border-black brutal-shadow">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Use the sidebar to navigate to different admin sections:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>
                <strong>AI Models:</strong> Models are managed via TypeScript registry files
              </li>
              <li>
                <strong>Templates:</strong> Create and manage content templates
                with preset parameters
              </li>
              <li>
                <strong>Users:</strong> View users, manage subscriptions, and
                grant admin roles
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-3 border-black brutal-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Community Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="community-toggle" className="font-bold">
                  Enable Community Creations
                </Label>
                <p className="text-sm text-muted-foreground">
                  Allow users to view shared creations from the community
                </p>
              </div>
              <Switch
                id="community-toggle"
                checked={communityEnabled}
                onCheckedChange={handleCommunityToggle}
                disabled={loadingCommunityToggle}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
