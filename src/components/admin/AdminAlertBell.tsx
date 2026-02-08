import { useState } from 'react';
import { Bell, Shield, User, AlertTriangle, Check, CheckCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAdminRealtimeAlerts, type AdminAlert } from '@/hooks/admin/useAdminRealtimeAlerts';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const getAlertIcon = (alertType: string) => {
  switch (alertType) {
    case 'moderation_repeat_offender':
      return <Shield className="h-4 w-4 text-amber-500" />;
    case 'new_user':
      return <User className="h-4 w-4 text-blue-500" />;
    default:
      return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical':
      return 'border-l-destructive bg-destructive/5';
    case 'warning':
      return 'border-l-amber-500 bg-amber-500/5';
    default:
      return 'border-l-blue-500 bg-blue-500/5';
  }
};

const AlertItem = ({ 
  alert, 
  onMarkRead, 
  onDelete 
}: { 
  alert: AdminAlert; 
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}) => {
  const timeAgo = formatDistanceToNow(new Date(alert.created_at), { addSuffix: true });
  
  return (
    <div 
      className={cn(
        "p-3 border-l-4 border-b last:border-b-0 transition-colors",
        getSeverityColor(alert.severity),
        !alert.is_read && "bg-muted/50"
      )}
    >
      <div className="flex items-start gap-2">
        {getAlertIcon(alert.alert_type)}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{alert.title}</span>
            {!alert.is_read && (
              <Badge variant="secondary" className="text-xs px-1 py-0">New</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{alert.message}</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
            <div className="flex items-center gap-1">
              {alert.user_id && (
                <Link 
                  href={`/admin/users/${alert.user_id}/generations`}
                  className="text-xs text-primary hover:underline"
                >
                  View User
                </Link>
              )}
              {!alert.is_read && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkRead(alert.id);
                  }}
                >
                  <Check className="h-3 w-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(alert.id);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AdminAlertBell = () => {
  const [open, setOpen] = useState(false);
  const { alerts, unreadCount, isLoading, markAsRead, markAllAsRead, deleteAlert } = useAdminRealtimeAlerts();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="font-semibold text-sm">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => markAllAsRead()}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-80">
          {isLoading ? (
            <div className="flex items-center justify-center h-20">
              <span className="text-sm text-muted-foreground">Loading...</span>
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-20 text-muted-foreground">
              <Bell className="h-6 w-6 mb-1 opacity-50" />
              <span className="text-sm">No notifications</span>
            </div>
          ) : (
            alerts.map((alert) => (
              <AlertItem 
                key={alert.id} 
                alert={alert} 
                onMarkRead={markAsRead}
                onDelete={deleteAlert}
              />
            ))
          )}
        </ScrollArea>
        <div className="p-2 border-t">
          <Link href="/admin/moderation" onClick={() => setOpen(false)}>
            <Button variant="ghost" size="sm" className="w-full text-xs">
              View Moderation Dashboard
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
};
