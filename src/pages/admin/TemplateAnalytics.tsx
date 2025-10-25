import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SmartLoader } from "@/components/ui/smart-loader";
import { Eye, MousePointerClick, TrendingUp, Award } from "lucide-react";

export default function TemplateAnalytics() {
  const { data: templates, isLoading } = useQuery({
    queryKey: ["template-analytics"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("template_landing_pages")
        .select("*")
        .eq("is_published", true)
        .order("view_count", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["category-analytics"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("template_categories")
        .select("*")
        .order("sort_order");

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <SmartLoader message="Loading analytics..." />;
  }

  const totalViews = templates?.reduce((sum: number, t: any) => sum + t.view_count, 0) || 0;
  const totalUses = templates?.reduce((sum: number, t: any) => sum + t.use_count, 0) || 0;
  const avgConversion = templates?.reduce((sum: number, t: any) => {
    const rate = t.view_count > 0 ? (t.use_count / t.view_count) * 100 : 0;
    return sum + rate;
  }, 0) / (templates?.length || 1);

  const topTemplates = templates?.slice(0, 5) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Template Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Track performance and engagement metrics
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalViews.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Uses</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUses.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Conversion</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgConversion.toFixed(1)}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published Templates</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates">Top Templates</TabsTrigger>
          <TabsTrigger value="categories">By Category</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topTemplates.map((template: any, index: number) => {
                  const conversionRate = template.view_count > 0 
                    ? ((template.use_count / template.view_count) * 100).toFixed(1)
                    : "0.0";
                  
                  return (
                    <div key={template.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <h3 className="font-semibold">{template.title}</h3>
                          <p className="text-sm text-muted-foreground">{template.category_slug}</p>
                        </div>
                      </div>
                      <div className="flex gap-6 text-sm">
                        <div className="text-center">
                          <div className="text-muted-foreground">Views</div>
                          <div className="font-semibold">{template.view_count.toLocaleString()}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted-foreground">Uses</div>
                          <div className="font-semibold">{template.use_count.toLocaleString()}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted-foreground">Conversion</div>
                          <div className="font-semibold text-primary">{conversionRate}%</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categories?.map((category: any) => {
                  const categoryTemplates = templates?.filter((t: any) => t.category_slug === category.slug) || [];
                  const categoryViews = categoryTemplates.reduce((sum: number, t: any) => sum + t.view_count, 0);
                  const categoryUses = categoryTemplates.reduce((sum: number, t: any) => sum + t.use_count, 0);
                  const categoryConversion = categoryViews > 0 
                    ? ((categoryUses / categoryViews) * 100).toFixed(1)
                    : "0.0";

                  return (
                    <div key={category.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="text-2xl">{category.icon}</div>
                        <div>
                          <h3 className="font-semibold">{category.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {categoryTemplates.length} template{categoryTemplates.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-6 text-sm">
                        <div className="text-center">
                          <div className="text-muted-foreground">Views</div>
                          <div className="font-semibold">{categoryViews.toLocaleString()}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted-foreground">Uses</div>
                          <div className="font-semibold">{categoryUses.toLocaleString()}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted-foreground">Conversion</div>
                          <div className="font-semibold text-primary">{categoryConversion}%</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
