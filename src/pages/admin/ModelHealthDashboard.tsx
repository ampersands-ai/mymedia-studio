import { useState, useMemo } from "react";
import { useModelHealth } from "@/hooks/admin/model-health/useModelHealth";
import { useHealthMetrics } from "@/hooks/admin/model-health/useHealthMetrics";
import { useModelTesting } from "@/hooks/admin/model-health/useModelTesting";
import { ModelHealthHeader } from "@/components/admin/model-health/ModelHealthHeader";
import { ModelHealthFilters } from "@/components/admin/model-health/ModelHealthFilters";
import { ModelTestGrid } from "@/components/admin/model-health/ModelTestGrid";
import { BulkTestControls } from "@/components/admin/model-health/BulkTestControls";
import { TestConfigDialog } from "@/components/admin/model-health/TestConfigDialog";
import { TestHistoryDialog } from "@/components/admin/model-health/TestHistoryDialog";
import { PerformanceCharts } from "@/components/admin/model-health/PerformanceCharts";
import { TestHistoryTable } from "@/components/admin/model-health/TestHistoryTable";
import { ScheduleDialog } from "@/components/admin/model-health/ScheduleDialog";
import { ModelAlertSettings } from "@/components/admin/model-health/ModelAlertSettings";
import { SchedulesList } from "@/components/admin/model-health/SchedulesList";
import { Skeleton } from "@/components/ui/skeleton";
import type { ModelHealthSummary } from "@/types/admin/model-health";

export default function ModelHealthDashboard() {
  const { data: healthData, isLoading } = useModelHealth();
  const metrics = useHealthMetrics(healthData);
  const { testModel, batchTest } = useModelTesting();

  const [selectedProvider, setSelectedProvider] = useState("all");
  const [selectedContentType, setSelectedContentType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [testingModelIds, setTestingModelIds] = useState<Set<string>>(new Set());
  const [isBulkTesting, setIsBulkTesting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [configDialogModel, setConfigDialogModel] = useState<ModelHealthSummary | null>(null);
  const [historyDialogModel, setHistoryDialogModel] = useState<ModelHealthSummary | null>(null);
  const [scheduleDialogModel, setScheduleDialogModel] = useState<ModelHealthSummary | null>(null);

  // Extract unique providers and content types
  const providers = useMemo(() => {
    if (!healthData) return [];
    return Array.from(new Set(healthData.map(m => m.provider))).sort();
  }, [healthData]);

  const contentTypes = useMemo(() => {
    if (!healthData) return [];
    return Array.from(new Set(healthData.map(m => m.content_type))).sort();
  }, [healthData]);

  // Filter models
  const filteredModels = useMemo(() => {
    if (!healthData) return [];

    return healthData.filter((model) => {
      // Provider filter
      if (selectedProvider !== "all" && model.provider !== selectedProvider) {
        return false;
      }

      // Content type filter
      if (selectedContentType !== "all" && model.content_type !== selectedContentType) {
        return false;
      }

      // Status filter
      if (selectedStatus !== "all") {
        const successRate = model.success_rate_percent_24h || 0;
        if (selectedStatus === "success" && successRate < 95) return false;
        if (selectedStatus === "warning" && (successRate >= 95 || successRate < 80)) return false;
        if (selectedStatus === "error" && successRate >= 80) return false;
        if (selectedStatus === "never-tested" && model.last_test_at) return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          model.model_name.toLowerCase().includes(query) ||
          model.provider.toLowerCase().includes(query) ||
          model.content_type.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [healthData, selectedProvider, selectedContentType, selectedStatus, searchQuery]);

  const handleTestModel = async (modelRecordId: string) => {
    setTestingModelIds(prev => new Set(prev).add(modelRecordId));
    
    try {
      await testModel.mutateAsync({ modelRecordId });
    } finally {
      setTestingModelIds(prev => {
        const next = new Set(prev);
        next.delete(modelRecordId);
        return next;
      });
    }
  };

  const handleBulkTest = async (modelRecordIds: string[]) => {
    setIsBulkTesting(true);
    setBulkProgress(0);

    try {
      await batchTest.mutateAsync({ modelRecordIds });
    } finally {
      setIsBulkTesting(false);
      setBulkProgress(0);
    }
  };

  const handleTestAll = () => {
    const activeModels = filteredModels.filter(m => m.is_active);
    handleBulkTest(activeModels.map(m => m.record_id));
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
      </div>

      <ModelHealthHeader metrics={metrics} />

      <BulkTestControls
        totalModels={filteredModels.filter(m => m.is_active).length}
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

      <ModelTestGrid
        models={filteredModels}
        onTest={handleTestModel}
        onConfigure={setConfigDialogModel}
        onViewHistory={setHistoryDialogModel}
        onSchedule={setScheduleDialogModel}
        testingModelIds={testingModelIds}
      />

      {filteredModels.length > 0 && (
        <>
          <PerformanceCharts models={filteredModels} />
          <TestHistoryTable />
          
          <div className="grid gap-6 md:grid-cols-2">
            <ModelAlertSettings />
            <SchedulesList />
          </div>
        </>
      )}

      <TestConfigDialog
        model={configDialogModel}
        open={!!configDialogModel}
        onOpenChange={(open) => !open && setConfigDialogModel(null)}
        onSave={(config) => console.log("Save config:", config)}
      />

      <TestHistoryDialog
        model={historyDialogModel}
        open={!!historyDialogModel}
        onOpenChange={(open) => !open && setHistoryDialogModel(null)}
      />

      <ScheduleDialog
        model={scheduleDialogModel}
        open={!!scheduleDialogModel}
        onOpenChange={(open) => !open && setScheduleDialogModel(null)}
      />
    </div>
  );
}
