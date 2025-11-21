import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Search, Eye, EyeOff, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { getAllModels, type ModelModule } from "@/lib/models/registry";
import { useQuery } from "@tanstack/react-query";

const CONTENT_TYPE_LABELS: Record<string, string> = {
  "image_editing": "Image Editing",
  "prompt_to_image": "Text to Image",
  "prompt_to_video": "Text to Video",
  "image_to_video": "Image to Video",
  "prompt_to_audio": "Audio",
};

type TimePeriod = "day" | "week" | "month" | "all";

interface ModelStats {
  total: number;
  successful: number;
  failed: number;
}

export default function AIModelsDashboard() {
  const [search, setSearch] = useState("");
  const [contentTypeFilter, setContentTypeFilter] = useState<string>("all");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("week");
  const [expandedModel, setExpandedModel] = useState<string | null>(null);
  const [visibilityOverrides, setVisibilityOverrides] = useState<Record<string, boolean>>({});

  // Get all models from registry
  const models = useMemo(() => {
    return getAllModels().map(m => ({
      record_id: m.MODEL_CONFIG.recordId,
      model_id: m.MODEL_CONFIG.modelId,
      model_name: m.MODEL_CONFIG.modelName,
      provider: m.MODEL_CONFIG.provider,
      content_type: m.MODEL_CONFIG.contentType,
      base_cost: m.MODEL_CONFIG.baseCreditCost,
      is_active: m.MODEL_CONFIG.isActive,
      logo_url: m.MODEL_CONFIG.logoUrl,
      model_family: m.MODEL_CONFIG.modelFamily,
      schema: m.SCHEMA,
    }));
  }, []);

  // Get unique providers and content types for filters
  const providers = useMemo(() => [...new Set(models.map(m => m.provider))].sort(), [models]);
  const contentTypes = useMemo(() => [...new Set(models.map(m => m.content_type))].sort(), [models]);

  // Fetch visibility overrides from database
  useEffect(() => {
    const fetchVisibility = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "model_visibility")
        .single();

      if (data?.setting_value && typeof data.setting_value === 'object') {
        setVisibilityOverrides(data.setting_value as Record<string, boolean>);
      }
    };
    fetchVisibility();
  }, []);

  // Fetch generation stats
  const { data: stats } = useQuery({
    queryKey: ["model-stats", timePeriod],
    queryFn: async () => {
      const now = new Date();
      let startDate: string | null = null;

      if (timePeriod === "day") {
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      } else if (timePeriod === "week") {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (timePeriod === "month") {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      }

      let query = supabase
        .from("generations")
        .select("model_record_id, status");

      if (startDate) {
        query = query.gte("created_at", startDate);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Aggregate by model
      const statsByModel: Record<string, ModelStats> = {};
      (data || []).forEach((gen: any) => {
        const id = gen.model_record_id;
        if (!id) return;

        if (!statsByModel[id]) {
          statsByModel[id] = { total: 0, successful: 0, failed: 0 };
        }
        statsByModel[id].total++;
        if (gen.status === "completed") {
          statsByModel[id].successful++;
        } else if (gen.status === "failed") {
          statsByModel[id].failed++;
        }
      });

      return statsByModel;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Toggle visibility for a model
  const toggleVisibility = async (recordId: string, currentVisible: boolean) => {
    const newOverrides = {
      ...visibilityOverrides,
      [recordId]: !currentVisible,
    };

    setVisibilityOverrides(newOverrides);

    const { error } = await supabase
      .from("app_settings")
      .upsert({
        setting_key: "model_visibility",
        setting_value: newOverrides,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      toast.error("Failed to update visibility");
      // Revert on error
      setVisibilityOverrides(visibilityOverrides);
    } else {
      toast.success(`Model ${!currentVisible ? "shown" : "hidden"} from users`);
    }
  };

  // Check if model is visible to users
  const isVisibleToUsers = (recordId: string, isActive: boolean) => {
    if (recordId in visibilityOverrides) {
      return visibilityOverrides[recordId];
    }
    return isActive; // Default to is_active from registry
  };

  // Filter models
  const filteredModels = useMemo(() => {
    return models.filter(m => {
      if (search) {
        const searchLower = search.toLowerCase();
        if (!m.model_name.toLowerCase().includes(searchLower) &&
            !m.provider.toLowerCase().includes(searchLower) &&
            !m.model_id.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      if (contentTypeFilter !== "all" && m.content_type !== contentTypeFilter) {
        return false;
      }
      if (providerFilter !== "all" && m.provider !== providerFilter) {
        return false;
      }
      return true;
    });
  }, [models, search, contentTypeFilter, providerFilter]);

  // Summary stats
  const summaryStats = useMemo(() => {
    const totalModels = models.length;
    const visibleModels = models.filter(m => isVisibleToUsers(m.record_id, m.is_active)).length;
    const totalRuns = Object.values(stats || {}).reduce((sum, s) => sum + s.total, 0);
    const successRate = totalRuns > 0
      ? Math.round((Object.values(stats || {}).reduce((sum, s) => sum + s.successful, 0) / totalRuns) * 100)
      : 0;
    return { totalModels, visibleModels, totalRuns, successRate };
  }, [models, stats, visibilityOverrides]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Models Dashboard</h1>
        <p className="text-muted-foreground">
          View-only overview of all AI models and their performance
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Models</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalModels}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Visible to Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.visibleModels}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Runs ({timePeriod === "all" ? "All Time" : `Last ${timePeriod}`})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalRuns}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.successRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search models..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={contentTypeFilter} onValueChange={setContentTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Content Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {contentTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {CONTENT_TYPE_LABELS[type] || type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={providerFilter} onValueChange={setProviderFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Providers</SelectItem>
                {providers.map(p => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={timePeriod} onValueChange={(v) => setTimePeriod(v as TimePeriod)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Time Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Last 24h</SelectItem>
                <SelectItem value="week">Last Week</SelectItem>
                <SelectItem value="month">Last Month</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Models Table */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-center">Visible</TableHead>
                <TableHead className="text-right">Runs</TableHead>
                <TableHead className="text-right">Success</TableHead>
                <TableHead className="text-right">Failed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredModels.map(model => {
                const modelStats = stats?.[model.record_id] || { total: 0, successful: 0, failed: 0 };
                const visible = isVisibleToUsers(model.record_id, model.is_active);
                const isExpanded = expandedModel === model.record_id;

                return (
                  <>
                    <TableRow key={model.record_id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => setExpandedModel(isExpanded ? null : model.record_id)}
                        >
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {model.logo_url && (
                            <img src={model.logo_url} alt="" className="h-6 w-6 rounded object-contain" />
                          )}
                          <div>
                            <div className="font-medium">{model.model_name}</div>
                            <div className="text-xs text-muted-foreground">{model.model_id}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{model.provider}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {CONTENT_TYPE_LABELS[model.content_type] || model.content_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {model.base_cost} credits
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Switch
                            checked={visible}
                            onCheckedChange={() => toggleVisibility(model.record_id, visible)}
                          />
                          {visible ? (
                            <Eye className="h-4 w-4 text-green-500" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {modelStats.total}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-green-600 font-mono">{modelStats.successful}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-red-600 font-mono">{modelStats.failed}</span>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow key={`${model.record_id}-expanded`}>
                        <TableCell colSpan={9} className="bg-muted/30 p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-semibold mb-2">Schema Properties</h4>
                              <div className="bg-background rounded p-3 text-sm font-mono max-h-[300px] overflow-auto">
                                {model.schema?.properties ? (
                                  <ul className="space-y-1">
                                    {Object.entries(model.schema.properties).map(([key, prop]: [string, any]) => (
                                      <li key={key} className="flex justify-between">
                                        <span className="text-blue-600">{key}</span>
                                        <span className="text-muted-foreground">
                                          {prop.type || 'any'}
                                          {model.schema.required?.includes(key) && (
                                            <span className="text-red-500 ml-1">*</span>
                                          )}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <span className="text-muted-foreground">No schema defined</span>
                                )}
                              </div>
                            </div>
                            <div>
                              <h4 className="font-semibold mb-2">Model Details</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Record ID</span>
                                  <span className="font-mono text-xs">{model.record_id}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Model Family</span>
                                  <span>{model.model_family || "—"}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Registry Status</span>
                                  <Badge variant={model.is_active ? "default" : "secondary"}>
                                    {model.is_active ? "Active" : "Inactive"}
                                  </Badge>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Success Rate</span>
                                  <span>
                                    {modelStats.total > 0
                                      ? `${Math.round((modelStats.successful / modelStats.total) * 100)}%`
                                      : "—"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
          {filteredModels.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No models found matching your filters
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
