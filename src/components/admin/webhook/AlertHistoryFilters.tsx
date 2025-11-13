import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { AlertHistoryFilters as AlertHistoryFiltersType } from "@/types/admin/webhook-monitoring";

interface AlertHistoryFiltersProps {
  filters: AlertHistoryFiltersType;
  onFilterChange: (filters: AlertHistoryFiltersType) => void;
}

export const AlertHistoryFilters = ({ filters, onFilterChange }: AlertHistoryFiltersProps) => {
  const clearFilters = () => {
    onFilterChange({});
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== undefined);

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Filters</h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="space-y-2">
          <Label>Alert Type</Label>
          <Select
            value={filters.alertType || 'all'}
            onValueChange={(value) =>
              onFilterChange({ ...filters, alertType: value === 'all' ? undefined : value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="failure_rate">Failure Rate</SelectItem>
              <SelectItem value="storage_spike">Storage Spike</SelectItem>
              <SelectItem value="test">Test Alert</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Severity</Label>
          <Select
            value={filters.severity || 'all'}
            onValueChange={(value) =>
              onFilterChange({ ...filters, severity: value === 'all' ? undefined : value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All severities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={
              filters.isResolved === undefined
                ? 'all'
                : filters.isResolved
                ? 'resolved'
                : 'unresolved'
            }
            onValueChange={(value) =>
              onFilterChange({
                ...filters,
                isResolved: value === 'all' ? undefined : value === 'resolved',
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="unresolved">Unresolved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>From Date</Label>
          <Input
            type="date"
            value={filters.dateFrom || ''}
            onChange={(e) =>
              onFilterChange({ ...filters, dateFrom: e.target.value || undefined })
            }
          />
        </div>

        <div className="space-y-2">
          <Label>To Date</Label>
          <Input
            type="date"
            value={filters.dateTo || ''}
            onChange={(e) =>
              onFilterChange({ ...filters, dateTo: e.target.value || undefined })
            }
          />
        </div>
      </div>
    </div>
  );
};
