import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ProviderStats } from "@/hooks/admin/useWebhookAnalytics";
import { ArrowUpDown } from "lucide-react";
import { useState } from "react";

interface Props {
  providers: ProviderStats[];
}

type SortKey = keyof ProviderStats;

export const WebhookProviderStatsTable = ({ providers }: Props) => {
  const [sortKey, setSortKey] = useState<SortKey>('totalEvents');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const sortedProviders = [...providers].sort((a, b) => {
    const aValue = a[sortKey];
    const bValue = b[sortKey];
    const modifier = sortDirection === 'asc' ? 1 : -1;
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return (aValue - bValue) * modifier;
    }
    return String(aValue).localeCompare(String(bValue)) * modifier;
  });

  const getSuccessRateBadge = (rate: number) => {
    if (rate >= 95) return <Badge variant="default" className="bg-green-500">Excellent</Badge>;
    if (rate >= 90) return <Badge variant="default" className="bg-yellow-500">Good</Badge>;
    if (rate >= 80) return <Badge variant="default" className="bg-orange-500">Fair</Badge>;
    return <Badge variant="destructive">Poor</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Provider Statistics</CardTitle>
        <CardDescription>
          Detailed performance metrics by provider
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer hover:bg-accent"
                onClick={() => handleSort('provider')}
              >
                Provider <ArrowUpDown className="inline h-4 w-4 ml-1" />
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-accent"
                onClick={() => handleSort('totalEvents')}
              >
                Events <ArrowUpDown className="inline h-4 w-4 ml-1" />
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-accent"
                onClick={() => handleSort('successRate')}
              >
                Success Rate <ArrowUpDown className="inline h-4 w-4 ml-1" />
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-accent"
                onClick={() => handleSort('avgDuration')}
              >
                Avg Duration <ArrowUpDown className="inline h-4 w-4 ml-1" />
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-accent"
                onClick={() => handleSort('p95Duration')}
              >
                P95 <ArrowUpDown className="inline h-4 w-4 ml-1" />
              </TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedProviders.map((provider) => (
              <TableRow key={provider.provider}>
                <TableCell className="font-medium capitalize">
                  {provider.provider.replace('-', ' ')}
                </TableCell>
                <TableCell>{provider.totalEvents.toLocaleString()}</TableCell>
                <TableCell>{provider.successRate.toFixed(1)}%</TableCell>
                <TableCell>{provider.avgDuration}ms</TableCell>
                <TableCell>{provider.p95Duration}ms</TableCell>
                <TableCell>{getSuccessRateBadge(provider.successRate)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
