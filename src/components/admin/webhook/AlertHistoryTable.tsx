import { useState } from "react";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle, AlertTriangle, Info, Download } from "lucide-react";
import { AlertHistoryItem } from "@/hooks/admin/useAlertHistory";

interface AlertHistoryTableProps {
  alerts: AlertHistoryItem[];
  onResolve: (id: string, notes?: string) => void;
  isResolving: boolean;
}

export const AlertHistoryTable = ({ alerts, onResolve, isResolving }: AlertHistoryTableProps) => {
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'default';
      case 'info':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'info':
        return <Info className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getResolutionTime = (alert: AlertHistoryItem) => {
    if (!alert.resolved_at) return null;
    const created = new Date(alert.created_at).getTime();
    const resolved = new Date(alert.resolved_at).getTime();
    const diffMs = resolved - created;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMins % 60}m`;
    }
    return `${diffMins}m`;
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Type', 'Severity', 'Message', 'Trigger Value', 'Threshold', 'Channels', 'Status', 'Resolution Time'];
    const rows = alerts.map(alert => [
      format(new Date(alert.created_at), 'yyyy-MM-dd HH:mm:ss'),
      alert.alert_type,
      alert.severity,
      alert.message,
      alert.trigger_value,
      alert.threshold_value,
      alert.channels_sent.join(', '),
      alert.is_resolved ? 'Resolved' : 'Unresolved',
      getResolutionTime(alert) || 'N/A'
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alert-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Alert History</h3>
        <Button onClick={exportToCSV} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Trigger/Threshold</TableHead>
              <TableHead>Channels</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Resolution Time</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alerts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  No alerts found
                </TableCell>
              </TableRow>
            ) : (
              alerts.map((alert) => (
                <TableRow key={alert.id}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(alert.created_at), 'MMM dd, HH:mm')}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{alert.alert_type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getSeverityColor(alert.severity)} className="gap-1">
                      {getSeverityIcon(alert.severity)}
                      {alert.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-md truncate">{alert.message}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{alert.trigger_value.toFixed(1)}%</div>
                      <div className="text-muted-foreground">/ {alert.threshold_value}%</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {alert.channels_sent.map((channel) => (
                        <Badge key={channel} variant="secondary" className="text-xs">
                          {channel}
                        </Badge>
                      ))}
                      {alert.channels_failed.map((channel) => (
                        <Badge key={channel} variant="destructive" className="text-xs">
                          {channel} (failed)
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {alert.is_resolved ? (
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Resolved
                      </Badge>
                    ) : (
                      <Badge variant="outline">Unresolved</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {alert.is_resolved ? (
                      <span className="text-sm">{getResolutionTime(alert)}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {!alert.is_resolved && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            Resolve
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Resolve Alert</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <p className="text-sm text-muted-foreground mb-2">
                                Alert: {alert.message}
                              </p>
                              <Textarea
                                placeholder="Add resolution notes (optional)"
                                value={resolutionNotes[alert.id] || ''}
                                onChange={(e) =>
                                  setResolutionNotes({ ...resolutionNotes, [alert.id]: e.target.value })
                                }
                              />
                            </div>
                            <Button
                              onClick={() => {
                                onResolve(alert.id, resolutionNotes[alert.id]);
                                setResolutionNotes({ ...resolutionNotes, [alert.id]: '' });
                              }}
                              disabled={isResolving}
                              className="w-full"
                            >
                              Mark as Resolved
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                    {alert.is_resolved && alert.resolution_notes && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            View Notes
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Resolution Notes</DialogTitle>
                          </DialogHeader>
                          <div className="text-sm text-muted-foreground">
                            {alert.resolution_notes}
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
