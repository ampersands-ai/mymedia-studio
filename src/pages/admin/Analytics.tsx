import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Loader2, TrendingUp, Users, Zap, Image } from "lucide-react";
import { startOfDay, startOfWeek, startOfMonth, format, subDays } from "date-fns";

export default function Analytics() {
  // Fetch total users stats
  const { data: userStats, isLoading: loadingUsers } = useQuery({
    queryKey: ["analytics-users"],
    queryFn: async () => {
      const now = new Date();
      const todayStart = startOfDay(now);
      const weekStart = startOfWeek(now);
      const monthStart = startOfMonth(now);

      const [totalRes, todayRes, weekRes, monthRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true } as any),
        supabase.from("profiles").select("id", { count: "exact", head: true } as any).gte("created_at", todayStart.toISOString()),
        supabase.from("profiles").select("id", { count: "exact", head: true } as any).gte("created_at", weekStart.toISOString()),
        supabase.from("profiles").select("id", { count: "exact", head: true } as any).gte("created_at", monthStart.toISOString()),
      ]);

      return {
        total: totalRes.count || 0,
        today: todayRes.count || 0,
        thisWeek: weekRes.count || 0,
        thisMonth: monthRes.count || 0,
      };
    },
  });

  // Fetch generation stats
  const { data: genStats, isLoading: loadingGens } = useQuery({
    queryKey: ["analytics-generations"],
    queryFn: async () => {
      const [totalRes, completedRes] = await Promise.all([
        supabase.from("generations").select("id", { count: "exact", head: true } as any),
        supabase.from("generations").select("id", { count: "exact", head: true } as any).eq("status", "completed"),
      ]);

      return {
        total: totalRes.count || 0,
        completed: completedRes.count || 0,
      };
    },
  });

  // Fetch conversion rate (users with paid plans)
  const { data: conversionRate, isLoading: loadingConversion } = useQuery({
    queryKey: ["analytics-conversion"],
    queryFn: async () => {
      const [totalRes, paidRes] = await Promise.all([
        supabase.from("user_subscriptions").select("id", { count: "exact", head: true } as any),
        supabase.from("user_subscriptions").select("id", { count: "exact", head: true } as any).neq("plan", "freemium"),
      ]);

      const total = totalRes.count || 0;
      const paid = paidRes.count || 0;
      return total > 0 ? ((paid / total) * 100).toFixed(2) : "0.00";
    },
  });

  // Fetch top 5 models by usage
  const { data: topModels, isLoading: loadingModels } = useQuery({
    queryKey: ["analytics-top-models"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generations")
        .select("model_id")
        .not("model_id", "is", null);

      if (error) throw error;

      const modelCounts = data.reduce((acc, gen) => {
        const model = gen.model_id || "Unknown";
        acc[model] = (acc[model] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(modelCounts)
        .map(([model, count]) => ({ model, count: typeof count === 'number' ? count : 0 }))
        .sort((a, b) => (typeof b.count === 'number' ? b.count : 0) - (typeof a.count === 'number' ? a.count : 0))
        .slice(0, 5);
    },
  });

  // Fetch daily signups and generations for the last 30 days
  const { data: dailyData, isLoading: loadingDaily } = useQuery({
    queryKey: ["analytics-daily"],
    queryFn: async () => {
      const days = 30;
      const dates = Array.from({ length: days }, (_, i) => {
        const date = subDays(new Date(), days - 1 - i);
        return {
          date,
          dateStr: format(date, "yyyy-MM-dd"),
          label: format(date, "MMM dd"),
        };
      });

      const [signupsRes, generationsRes] = await Promise.all([
        supabase.from("profiles").select("created_at"),
        supabase.from("generations").select("created_at").eq("status", "completed"),
      ]);

      const signupsByDate = (signupsRes.data || []).reduce((acc, profile) => {
        const date = format(new Date(profile.created_at), "yyyy-MM-dd");
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const gensByDate = (generationsRes.data || []).reduce((acc, gen) => {
        const date = format(new Date(gen.created_at), "yyyy-MM-dd");
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return dates.map(({ dateStr, label }) => ({
        date: label,
        signups: signupsByDate[dateStr] || 0,
        generations: gensByDate[dateStr] || 0,
      }));
    },
  });

  const isLoading = loadingUsers || loadingGens || loadingConversion || loadingModels || loadingDaily;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
        <p className="text-muted-foreground">Track key metrics and user behavior</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats?.total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +{userStats?.today} today, +{userStats?.thisWeek} this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Generations</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{genStats?.completed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {genStats?.total.toLocaleString()} total (including pending)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversionRate}%</div>
            <p className="text-xs text-muted-foreground">Freemium to paid conversion</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg per User</CardTitle>
            <Image className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userStats?.total ? ((genStats?.completed || 0) / userStats.total).toFixed(1) : "0"}
            </div>
            <p className="text-xs text-muted-foreground">Generations per user</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="daily" className="space-y-4">
        <TabsList>
          <TabsTrigger value="daily">Daily Trends</TabsTrigger>
          <TabsTrigger value="models">Top Models</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Signups & Generations (Last 30 Days)</CardTitle>
              <CardDescription>Daily activity trends</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  signups: {
                    label: "Signups",
                    color: "hsl(var(--primary))",
                  },
                  generations: {
                    label: "Generations",
                    color: "hsl(var(--accent))",
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyData || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="signups"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="generations"
                      stroke="hsl(var(--accent))"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top 5 Models by Usage</CardTitle>
              <CardDescription>Most popular AI models</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  count: {
                    label: "Generations",
                    color: "hsl(var(--primary))",
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topModels || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="model" type="category" width={150} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
