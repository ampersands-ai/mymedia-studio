import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Session {
  id: string;
  user_agent: string;
  ip_address: string;
  created_at: string;
  last_active: string;
  is_current: boolean;
}

interface AuditLog {
  id: string;
  action: string;
  resource_type: string;
  created_at: string;
  metadata?: Record<string, any>;
}

interface SecuritySectionProps {
  sessions: Session[];
  loadingSessions: boolean;
  auditLogs: AuditLog[];
  loadingAuditLogs: boolean;
}

export function SecuritySection({ sessions, loadingSessions, auditLogs, loadingAuditLogs }: SecuritySectionProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>Manage your active login sessions</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingSessions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No active sessions found.
            </p>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{session.user_agent}</span>
                      {session.is_current && (
                        <Badge variant="default" className="text-xs">
                          Current
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      IP: {session.ip_address}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Last active {formatDistanceToNow(new Date(session.last_active), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
          <CardDescription>Recent account activity and security events</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingAuditLogs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : auditLogs.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No audit logs yet.
            </p>
          ) : (
            <div className="space-y-3">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold capitalize">{log.action.replace(/_/g, ' ')}</span>
                      <Badge variant="outline" className="text-xs">
                        {log.resource_type}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
