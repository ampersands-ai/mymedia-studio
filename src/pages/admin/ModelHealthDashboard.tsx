import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ModelHealthHeader } from "@/components/admin/model-health/ModelHealthHeader";
import { ModelHealthFilters } from "@/components/admin/model-health/ModelHealthFilters";
import { ModelTestGrid } from "@/components/admin/model-health/ModelTestGrid";
import { BulkTestControls } from "@/components/admin/model-health/BulkTestControls";
import { PerformanceCharts } from "@/components/admin/model-health/PerformanceCharts";
import { TestHistoryTable } from "@/components/admin/model-health/TestHistoryTable";
import { logger } from "@/lib/logger";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LayoutGrid, List, ArrowUpDown, ArrowUp, ArrowDown, PlayCircle, Settings2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { ModelHealthSummary } from "@/types/admin/model-health";

type ViewMode = 'grid' | 'list';
type SortField = 'model_name' | 'provider' | 'groups' | 'success_rate_percent_24h' | 'avg_latency_ms' | 'total_tests_24h' | 'last_test_at';
type SortDirection = 'asc' | 'desc';

export default function ModelHealthDashboard() {
  const navigate = useNavigate();
  
  // Fetch health data from file-based registry (database removed)
  const { data: healthData, isLoading } = useQuery({
    queryKey: ["model-health-summary"],
    queryFn: async () => {
      // Model health monitoring deprecated after ai_models table removal
      // Return empty array since model metadata now lives in file-based registry
      return [] as ModelHealthSummary[];
    },
    refetchInterval: 30000,
  });

  // Calculate metrics from health data
  const metrics = useMemo(() => {
    if (!healthData || healthData.length === 0) {
      return {
        totalModels: 0,
        activeModels: 0,
        testedLast24h: 0,
        successRate: 0,
        avgLatency: 0,
        failedModels: 0,
      };
    }

    const totalModels = healthData.length;
    const activeModels = healthData.filter(m => m.is_active).length;
    const testedLast24h = healthData.filter(m => m.last_test_at && 
      new Date(m.last_test_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length;

    const testedModels = healthData.filter(m => m.total_tests_24h > 0);
    const successRate = testedModels.length > 0
      ? testedModels.reduce((sum, m) => sum + (m.success_rate_percent_24h || 0), 0) / testedModels.length
      : 0;

    const modelsWithLatency = healthData.filter(m => m.avg_latency_ms !== null);
    const avgLatency = modelsWithLatency.length > 0
      ? modelsWithLatency.reduce((sum, m) => sum + (m.avg_latency_ms || 0), 0) / modelsWithLatency.length / 1000
      : 0;

    const failedModels = healthData.filter(m => 
      m.success_rate_percent_24h !== null && m.success_rate_percent_24h < 80
    ).length;

    return {
      totalModels,
      activeModels,
      testedLast24h,
      successRate: Math.round(successRate * 10) / 10,
      avgLatency: Math.round(avgLatency * 10) / 10,
      failedModels,
    };
  }, [healthData]);

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortField, setSortField] = useState<SortField>('model_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedProvider, setSelectedProvider] = useState("all");
  const [selectedContentType, setSelectedContentType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [testingModelIds] = useState<Set<string>>(new Set());
  const [isBulkTesting, setIsBulkTesting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);

  const providers = useMemo(() => {
    if (!healthData) return [];
    return Array.from(new Set(healthData.map(m => m.provider))).sort();
  }, [healthData]);

  const contentTypes = useMemo(() => {
    if (!healthData) return [];
    return Array.from(new Set(healthData.map(m => m.content_type))).sort();
  }, [healthData]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedModels = useMemo(() => {
    if (!healthData) return [];

    const filtered = healthData.filter((model) => {
      if (selectedProvider !== "all" && model.provider !== selectedProvider) return false;
      if (selectedContentType !== "all" && model.content_type !== selectedContentType) return false;
      
      if (selectedStatus !== "all") {
        const successRate = model.success_rate_percent_24h || 0;
        if (selectedStatus === "success" && successRate < 95) return false;
        if (selectedStatus === "warning" && (successRate >= 95 || successRate < 80)) return false;
        if (selectedStatus === "error" && successRate >= 80) return false;
        if (selectedStatus === "never-tested" && model.last_test_at) return false;
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          model.model_name.toLowerCase().includes(query) ||
          model.provider.toLowerCase().includes(query) ||
          model.content_type.toLowerCase().includes(query) ||
          model.model_id.toLowerCase().includes(query)
        );
      }

      return true;
    });

    return filtered.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (aVal === null || aVal === undefined) aVal = sortDirection === 'asc' ? Infinity : -Infinity;
      if (bVal === null || bVal === undefined) bVal = sortDirection === 'asc' ? Infinity : -Infinity;

      if (sortField === 'last_test_at') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [healthData, selectedProvider, selectedContentType, selectedStatus, searchQuery, sortField, sortDirection]);

  const handleTestModel = (modelRecordId: string) => {
    navigate(`/admin/model-health/test/${modelRecordId}`);
  };

  const handleBulkTest = async () => {
    setIsBulkTesting(true);
    setBulkProgress(0);

    try {
      // Batch testing functionality removed - use individual test page instead
      toast.error("Batch testing is currently unavailable. Please test models individually.");
    } finally {
      setIsBulkTesting(false);
      setBulkProgress(0);
    }
  };

  const handleTestAll = () => {
    const activeModels = filteredAndSortedModels.filter(m => m.is_active);
    handleBulkTest();
  };

  const getStatusBadge = (model: ModelHealthSummary) => {
    if (!model.last_test_at) {
      return <Badge variant="secondary">Never Tested</Badge>;
    }
    
    // Check if last test was recent (within 5 minutes) and successful
    const lastTestTime = new Date(model.last_test_at).getTime();
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    const isRecentTest = lastTestTime > fiveMinutesAgo;
    
    const successRate = model.success_rate_percent_24h || 0;
    
    // If recently tested successfully, show as Healthy regardless of 24h rate
    if (isRecentTest && model.successful_tests_24h > 0 && model.total_tests_24h > 0) {
      const recentTestSuccessful = (model.successful_tests_24h / model.total_tests_24h) > 0;
      if (recentTestSuccessful) {
        return <Badge className="bg-green-500 hover:bg-green-600">Healthy ✓</Badge>;
      }
    }
    
    if (successRate >= 95) {
      return <Badge className="bg-green-500 hover:bg-green-600">Healthy</Badge>;
    }
    if (successRate >= 80) {
      return <Badge className="bg-yellow-500 hover:bg-yellow-600">Warning</Badge>;
    }
    return <Badge variant="destructive">Critical</Badge>;
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="ml-2 h-4 w-4" />
      : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Model Health Dashboard</h1>
        </div>
        <div className="grid grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-12" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Model Health Dashboard</h1>
        <div className="flex gap-2">
          <Button
            onClick={() => navigate('/admin/model-health/comprehensive-test')}
            className="gap-2"
          >
            <Settings2 className="h-4 w-4" />
            Comprehensive Test
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4 mr-2" />
            List
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="h-4 w-4 mr-2" />
            Grid
          </Button>
        </div>
      </div>

      <ModelHealthHeader metrics={metrics} />

      <BulkTestControls
        totalModels={filteredAndSortedModels.filter(m => m.is_active).length}
        selectedCount={0}
        isRunning={isBulkTesting}
        progress={bulkProgress}
        onTestAll={handleTestAll}
        onTestSelected={() => {}}
        onCancel={() => setIsBulkTesting(false)}
      />

      <ModelHealthFilters
        providers={providers}
        contentTypes={contentTypes}
        selectedProvider={selectedProvider}
        selectedContentType={selectedContentType}
        selectedStatus={selectedStatus}
        searchQuery={searchQuery}
        onProviderChange={setSelectedProvider}
        onContentTypeChange={setSelectedContentType}
        onStatusChange={setSelectedStatus}
        onSearchChange={setSearchQuery}
      />

      {viewMode === 'grid' ? (
        <ModelTestGrid
          models={filteredAndSortedModels}
          onTest={handleTestModel}
          onConfigure={() => {}}
          onViewHistory={() => {}}
          onSchedule={() => {}}
          testingModelIds={testingModelIds}
        />
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    onClick={() => handleSort('model_name')}
                    className="hover:bg-transparent"
                  >
                    Model Name
                    <SortIcon field="model_name" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    onClick={() => handleSort('provider')}
                    className="hover:bg-transparent"
                  >
                    Provider
                    <SortIcon field="provider" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    onClick={() => handleSort('groups')}
                    className="hover:bg-transparent"
                  >
                    Group
                    <SortIcon field="groups" />
                  </Button>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    onClick={() => handleSort('success_rate_percent_24h')}
                    className="hover:bg-transparent"
                  >
                    Success Rate
                    <SortIcon field="success_rate_percent_24h" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    onClick={() => handleSort('avg_latency_ms')}
                    className="hover:bg-transparent"
                  >
                    Avg Latency
                    <SortIcon field="avg_latency_ms" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    onClick={() => handleSort('total_tests_24h')}
                    className="hover:bg-transparent"
                  >
                    Tests (24h)
                    <SortIcon field="total_tests_24h" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    onClick={() => handleSort('last_test_at')}
                    className="hover:bg-transparent"
                  >
                    Last Test
                    <SortIcon field="last_test_at" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedModels.map((model) => (
                <TableRow 
                  key={model.record_id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => model.is_active && handleTestModel(model.record_id)}
                >
                  <TableCell className="font-medium">{model.model_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{model.provider}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{model.groups || '—'}</Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(model)}</TableCell>
                  <TableCell>
                    {model.success_rate_percent_24h !== null 
                      ? `${model.success_rate_percent_24h.toFixed(1)}%` 
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {model.avg_latency_ms !== null 
                      ? `${(model.avg_latency_ms / 1000).toFixed(2)}s` 
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {model.total_tests_24h > 0 
                      ? `${model.successful_tests_24h}/${model.total_tests_24h}` 
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {model.last_test_at 
                      ? formatDistanceToNow(new Date(model.last_test_at), { addSuffix: true })
                      : 'Never'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTestModel(model.record_id);
                      }}
                      disabled={!model.is_active}
                    >
                      <PlayCircle className="h-4 w-4 mr-1" />
                      Test
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredAndSortedModels.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    No models found matching your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {filteredAndSortedModels.length > 0 && (
        <>
          <PerformanceCharts models={filteredAndSortedModels} />
          <TestHistoryTable />
        </>
      )}
    </div>
  );
}
