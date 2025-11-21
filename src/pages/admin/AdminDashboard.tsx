import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, FileText, Zap, TrendingUp, Users, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ModelHealthWidget } from "@/components/admin/model-health/ModelHealthWidget";
import { getAllModels } from "@/lib/models/registry";
import { syncRegistryToDatabase, checkRegistrySync } from "@/lib/models/syncRegistryToDatabase";

export default function AdminDashboard() {
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
  const [syncStatus, setSyncStatus] = useState<{ inSync: boolean; missingCount: number } | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch models count from registry (not database)
        const allModels = getAllModels();
        const totalModels = allModels.length;
        const activeModels = allModels.filter(m => m.MODEL_CONFIG.isActive).length;

        // Fetch templates count
        const { count: totalTemplates } = await supabase
          .from("content_templates")
          .select("*", { count: "exact", head: true });

        const { count: activeTemplates } = await supabase
          .from("content_templates")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true);

        // Fetch generations count
        const { count: totalGenerations } = await supabase
          .from("generations")
          .select("*", { count: "exact", head: true });

        const today = new Date().toISOString().split("T")[0];
        const { count: todayGenerations } = await supabase
          .from("generations")
          .select("*", { count: "exact", head: true })
          .gte("created_at", today);

        // Fetch storyboards count
        const { count: totalStoryboards } = await supabase
          .from("storyboards")
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

        // Check registry sync status
        const syncCheck = await checkRegistrySync();
        setSyncStatus({ inSync: syncCheck.inSync, missingCount: syncCheck.missingCount });
      } catch (error) {
        logger.error("Failed to fetch dashboard stats", error as Error, {
          component: 'AdminDashboard',
          operation: 'fetchStats'
        });
      }
    };

    fetchStats();
  }, []);

  const handleSyncRegistry = async () => {
    setSyncing(true);
    try {
      const result = await syncRegistryToDatabase();
      if (result.success) {
        toast.success(`Sync complete: ${result.inserted} inserted, ${result.updated} updated`);
        setSyncStatus({ inSync: true, missingCount: 0 });
      } else {
        toast.error(`Sync completed with errors: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      logger.error("Registry sync failed", error as Error, {
        component: 'AdminDashboard',
        operation: 'handleSyncRegistry'
      });
      toast.error("Failed to sync registry to database");
    } finally {
      setSyncing(false);
    }
  };

  const handleCommunityToggle = async (checked: boolean) => {
    setLoadingCommunityToggle(true);
    try {
      const { error } = await supabase
        .from("app_settings")
        .update({ 
          setting_value: { enabled: checked },
          updated_at: new Date().toISOString()
        })
        .eq("setting_key", "community_enabled");

      if (error) throw error;

      setCommunityEnabled(checked);
      toast.success(`Community ${checked ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
      logger.error("Failed to update community setting", error as Error, { 
        component: 'AdminDashboard',
        operation: 'handleCommunityToggle',
        checked
      });
      toast.error("Failed to update community setting");
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
                <strong>AI Models:</strong> Add, edit, or disable AI models and
                configure their credit costs
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

      {/* Registry Sync Card */}
      <Card className="border-3 border-black brutal-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Registry Database Sync
          </CardTitle>
          {syncStatus && (
            syncStatus.inSync ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-500" />
            )
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-bold">
                {syncStatus?.inSync
                  ? "Database is in sync with registry"
                  : syncStatus
                    ? `${syncStatus.missingCount} models missing from database`
                    : "Checking sync status..."}
              </p>
              <p className="text-sm text-muted-foreground">
                Sync TypeScript model registry to database for foreign key constraints
              </p>
            </div>
            <Button
              onClick={handleSyncRegistry}
              disabled={syncing}
              variant={syncStatus?.inSync ? "outline" : "default"}
            >
              {syncing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync Now
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Model Health Widget */}
      <div className="grid grid-cols-1 gap-6">
        <ModelHealthWidget />
      </div>
    </div>
  );
}
