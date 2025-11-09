import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useModelHealth } from "@/hooks/admin/model-health/useModelHealth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUpDown, PlayCircle, Search, ArrowUp, ArrowDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import type { ModelHealthSummary } from "@/types/admin/model-health";

type SortField = 'model_name' | 'provider' | 'content_type' | 'success_rate_percent_24h' | 'avg_latency_ms' | 'total_tests_24h' | 'last_test_at';
type SortDirection = 'asc' | 'desc';

export default function ModelsListPage() {
  const { data: models, isLoading } = useModelHealth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>('model_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedAndFilteredModels = useMemo(() => {
    if (!models) return [];

    let filtered = models.filter((model) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        model.model_name.toLowerCase().includes(query) ||
        model.provider.toLowerCase().includes(query) ||
        model.content_type.toLowerCase().includes(query) ||
        model.model_id.toLowerCase().includes(query)
      );
    });

    return filtered.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      // Handle null/undefined values
      if (aVal === null || aVal === undefined) aVal = sortDirection === 'asc' ? Infinity : -Infinity;
      if (bVal === null || bVal === undefined) bVal = sortDirection === 'asc' ? Infinity : -Infinity;

      // Handle dates
      if (sortField === 'last_test_at') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [models, searchQuery, sortField, sortDirection]);

  const getStatusBadge = (model: ModelHealthSummary) => {
    if (!model.last_test_at) {
      return <Badge variant="secondary">Never Tested</Badge>;
    }
    const successRate = model.success_rate_percent_24h || 0;
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
          <h1 className="text-3xl font-bold">AI Models</h1>
        </div>
        <Skeleton className="h-10 w-full max-w-sm" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Models</h1>
          <p className="text-muted-foreground mt-1">
            {sortedAndFilteredModels.length} models available
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search models, providers, types..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

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
                  onClick={() => handleSort('content_type')}
                  className="hover:bg-transparent"
                >
                  Type
                  <SortIcon field="content_type" />
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
            {sortedAndFilteredModels.map((model) => (
              <TableRow key={model.record_id} className="cursor-pointer hover:bg-muted/50">
                <TableCell className="font-medium">{model.model_name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{model.provider}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{model.content_type}</Badge>
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
                    onClick={() => navigate(`/admin/models/${model.record_id}/test`)}
                    disabled={!model.is_active}
                  >
                    <PlayCircle className="h-4 w-4 mr-1" />
                    Test
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {sortedAndFilteredModels.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                  No models found matching your search.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
