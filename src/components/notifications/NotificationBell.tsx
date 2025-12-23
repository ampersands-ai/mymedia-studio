import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, X, Sparkles, AlertTriangle, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUserNotifications, type UserNotification } from '@/hooks/useUserNotifications';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'generation_complete':
      return <Sparkles className="h-4 w-4 text-primary" />;
    case 'generation_failed':
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    case 'credit_warning_50':
    case 'credit_warning_90':
      return <Coins className="h-4 w-4 text-amber-500" />;
    case 'credit_exhausted':
      return <Coins className="h-4 w-4 text-destructive" />;
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
};

const getNotificationStyle = (type: string) => {
  switch (type) {
    case 'generation_complete':
      return 'border-l-primary bg-primary/5';
    case 'generation_failed':
      return 'border-l-destructive bg-destructive/5';
    case 'credit_warning_50':
    case 'credit_warning_90':
      return 'border-l-amber-500 bg-amber-500/5';
    case 'credit_exhausted':
      return 'border-l-destructive bg-destructive/5';
    default:
      return 'border-l-muted-foreground bg-muted/5';
  }
};

interface NotificationItemProps {
  notification: UserNotification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigate: (url: string) => void;
}

const NotificationItem = ({
  notification,
  onMarkRead,
  onDelete,
  onNavigate,
}: NotificationItemProps) => {
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: true });

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkRead(notification.id);
    }
    if (notification.action_url) {
      onNavigate(notification.action_url);
    }
  };

  return (
    <div
      className={cn(
        'p-3 border-l-4 border-b last:border-b-0 transition-colors cursor-pointer hover:bg-muted/50',
        getNotificationStyle(notification.type),
        !notification.is_read && 'bg-muted/30'
      )}
      onClick={handleClick}
    >
      <div className="flex items-start gap-2">
        {getNotificationIcon(notification.type)}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{notification.title}</span>
            {!notification.is_read && (
              <Badge variant="secondary" className="text-xs px-1 py-0">
                New
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {notification.message}
          </p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
            <div className="flex items-center gap-1">
              {!notification.is_read && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkRead(notification.id);
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
                  onDelete(notification.id);
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

export const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useUserNotifications();

  const handleNavigate = (url: string) => {
    setOpen(false);
    navigate(url);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
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
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-20 text-muted-foreground">
              <Bell className="h-6 w-6 mb-1 opacity-50" />
              <span className="text-sm">No notifications</span>
            </div>
          ) : (
            notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={markAsRead}
                onDelete={deleteNotification}
                onNavigate={handleNavigate}
              />
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
