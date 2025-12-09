/**
 * Admin Model Pricing Dashboard
 * Displays comprehensive pricing table with export functionality
 */

import { useState, useMemo, Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  RefreshCw, 
  Download, 
  Search, 
  ChevronDown, 
  ChevronRight,
  DollarSign,
  Activity,
  Layers,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getAllModels, type ModelModule } from "@/lib/models/registry";
import { toast } from "sonner";

interface PricingConfiguration {
  config: string;
  cost: number;
}

interface ModelPricingData {
  recordId: string;
  modelName: string;
  provider: string;
  category: string;
  status: "active" | "inactive";
  baseCost: number;
  configurations: PricingConfiguration[];
}

/**
 * Extract all pricing configurations from a model's schema
 */
function extractPricingConfigurations(model: ModelModule): PricingConfiguration[] {
  const configurations: PricingConfiguration[] = [];
  const schema = model.SCHEMA;
  const properties = schema.properties || {};
  
  // Find enum fields that affect pricing
  const enumFields: { name: string; values: string[] }[] = [];
  
  for (const [fieldName, fieldDef] of Object.entries(properties)) {
    const def = fieldDef as Record<string, unknown>;
    if (def.enum && Array.isArray(def.enum)) {
      enumFields.push({
        name: fieldName,
        values: def.enum as string[],
      });
    }
  }
  
  // If no enum fields, just return base cost
  if (enumFields.length === 0) {
    configurations.push({ config: "Default", cost: model.MODEL_CONFIG.baseCreditCost });
    return configurations;
  }
  
  // Generate combinations for up to 2 enum fields (to avoid explosion)
  const relevantFields = enumFields.slice(0, 2);
  
  if (relevantFields.length === 1) {
    for (const value of relevantFields[0].values) {
      try {
        const cost = model.calculateCost({ [relevantFields[0].name]: value });
        configurations.push({ config: `${relevantFields[0].name}: ${value}`, cost });
      } catch {
        configurations.push({ config: `${relevantFields[0].name}: ${value}`, cost: model.MODEL_CONFIG.baseCreditCost });
      }
    }
  } else if (relevantFields.length === 2) {
    for (const value1 of relevantFields[0].values) {
      for (const value2 of relevantFields[1].values) {
        try {
          const cost = model.calculateCost({ 
            [relevantFields[0].name]: value1,
            [relevantFields[1].name]: value2,
          });
          configurations.push({ 
            config: `${value1} × ${value2}`, 
            cost 
          });
        } catch {
          // Skip invalid combinations (field dependencies)
        }
      }
    }
  }
  
  // If no valid configurations generated, add default
  if (configurations.length === 0) {
    configurations.push({ config: "Default", cost: model.MODEL_CONFIG.baseCreditCost });
  }
  
  return configurations;
}

/**
 * Format category for display
 */
function formatCategory(category: string): string {
  return category
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function ModelPricing() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set());

  // Fetch model data from registry
  const { data: models, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["admin-model-pricing"],
    queryFn: async (): Promise<ModelPricingData[]> => {
      const allModels = getAllModels();
      
      return allModels.map((model) => ({
        recordId: model.MODEL_CONFIG.recordId,
        modelName: model.MODEL_CONFIG.modelName,
        provider: model.MODEL_CONFIG.provider,
        category: model.MODEL_CONFIG.contentType,
        status: model.MODEL_CONFIG.isActive ? "active" : "inactive",
        baseCost: model.MODEL_CONFIG.baseCreditCost,
        configurations: extractPricingConfigurations(model),
      }));
    },
    staleTime: 0, // Always refetch on mount
  });

  // Get unique categories and providers for filters
  const { categories, providers } = useMemo(() => {
    if (!models) return { categories: [], providers: [] };
    
    const cats = [...new Set(models.map(m => m.category))].sort();
    const provs = [...new Set(models.map(m => m.provider))].sort();
    
    return { categories: cats, providers: provs };
  }, [models]);

  // Filter models
  const filteredModels = useMemo(() => {
    if (!models) return [];
    
    return models.filter(model => {
      const matchesSearch = 
        model.modelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.provider.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === "all" || model.category === categoryFilter;
      const matchesProvider = providerFilter === "all" || model.provider === providerFilter;
      const matchesStatus = statusFilter === "all" || model.status === statusFilter;
      
      return matchesSearch && matchesCategory && matchesProvider && matchesStatus;
    });
  }, [models, searchQuery, categoryFilter, providerFilter, statusFilter]);

  // Calculate summary stats
  const stats = useMemo(() => {
    if (!models) return { total: 0, active: 0, inactive: 0, avgCost: 0, minCost: 0, maxCost: 0 };
    
    const active = models.filter(m => m.status === "active").length;
    const costs = models.map(m => m.baseCost);
    
    return {
      total: models.length,
      active,
      inactive: models.length - active,
      avgCost: costs.length > 0 ? (costs.reduce((a, b) => a + b, 0) / costs.length).toFixed(1) : 0,
      minCost: costs.length > 0 ? Math.min(...costs) : 0,
      maxCost: costs.length > 0 ? Math.max(...costs) : 0,
    };
  }, [models]);

  // Toggle model expansion
  const toggleExpanded = (recordId: string) => {
    setExpandedModels(prev => {
      const next = new Set(prev);
      if (next.has(recordId)) {
        next.delete(recordId);
      } else {
        next.add(recordId);
      }
      return next;
    });
  };

  // Export to CSV
  const exportToCSV = () => {
    if (!filteredModels.length) {
      toast.error("No data to export");
      return;
    }

    const rows: string[] = ["Model Name,Provider,Category,Status,Base Cost,Configuration,Configuration Cost"];
    
    for (const model of filteredModels) {
      for (const config of model.configurations) {
        rows.push(
          `"${model.modelName}","${model.provider}","${formatCategory(model.category)}","${model.status}",${model.baseCost},"${config.config}",${config.cost}`
        );
      }
    }

    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `model-pricing-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success("CSV exported successfully");
  };

  // Export to JSON
  const exportToJSON = () => {
    if (!filteredModels.length) {
      toast.error("No data to export");
      return;
    }

    const data = {
      exportedAt: new Date().toISOString(),
      totalModels: filteredModels.length,
      models: filteredModels.map(m => ({
        modelName: m.modelName,
        provider: m.provider,
        category: m.category,
        status: m.status,
        baseCost: m.baseCost,
        configurations: m.configurations,
      })),
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `model-pricing-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success("JSON exported successfully");
  };

  // Handle refresh
  const handleRefresh = async () => {
    await refetch();
    toast.success("Pricing data refreshed");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Model Pricing</h1>
          <p className="text-muted-foreground">View and export pricing for all AI models</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" onClick={exportToJSON}>
            <Download className="h-4 w-4 mr-2" />
            JSON
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Models</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{stats.active}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Inactive</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{stats.inactive}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Base Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{stats.avgCost}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cost Range</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{stats.minCost} - {stats.maxCost}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search models or providers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>{formatCategory(cat)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={providerFilter} onValueChange={setProviderFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Providers</SelectItem>
            {providers.map(prov => (
              <SelectItem key={prov} value={prov}>{prov}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Pricing Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead className="min-w-[180px]">Model Name</TableHead>
                  <TableHead className="w-[100px]">Provider</TableHead>
                  <TableHead className="w-[140px]">Category</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[100px] text-right">Base Cost</TableHead>
                  <TableHead className="w-[100px] text-right">Configs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredModels.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No models found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredModels.map((model) => {
                    const isExpanded = expandedModels.has(model.recordId);
                    const hasMultipleConfigs = model.configurations.length > 1;
                    
                    return (
                      <Fragment key={model.recordId}>
                        <TableRow 
                          className={hasMultipleConfigs ? "cursor-pointer hover:bg-muted/50" : ""}
                          onClick={() => hasMultipleConfigs && toggleExpanded(model.recordId)}
                        >
                          <TableCell className="w-12">
                            {hasMultipleConfigs && (
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </TableCell>
                          <TableCell className="font-medium min-w-[180px]">{model.modelName}</TableCell>
                          <TableCell className="w-[100px]">
                            <Badge variant="outline">{model.provider}</Badge>
                          </TableCell>
                          <TableCell className="w-[140px]">{formatCategory(model.category)}</TableCell>
                          <TableCell className="w-[100px]">
                            <Badge variant={model.status === "active" ? "default" : "secondary"}>
                              {model.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="w-[100px] text-right font-mono">{model.baseCost}</TableCell>
                          <TableCell className="w-[100px] text-right">
                            {hasMultipleConfigs ? (
                              <Badge variant="outline">{model.configurations.length} configs</Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                        {hasMultipleConfigs && isExpanded && (
                          <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableCell colSpan={7} className="p-0">
                              <div className="py-3 px-6">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                  {model.configurations.map((config, idx) => (
                                    <div
                                      key={idx}
                                      className="flex justify-between items-center px-3 py-2 bg-background rounded-md border"
                                    >
                                      <span className="text-sm">{config.config}</span>
                                      <span className="font-mono text-sm font-medium">{config.cost}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Showing {filteredModels.length} of {models?.length || 0} models
      </p>
    </div>
  );
}
