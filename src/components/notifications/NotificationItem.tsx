import { formatDistanceToNow } from 'date-fns';
import { Bell, Check, Info, Trash2, X, AlertTriangle, Gift, Trophy, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Notification, useNotificationStore } from '@/lib/notificationStore';
import { Button } from '@/components/ui/button';

interface NotificationItemProps {
    notification: Notification;
}

export function NotificationItem({ notification }: NotificationItemProps) {
    const { markAsRead, removeNotification } = useNotificationStore();

    const getIcon = () => {
        switch (notification.type) {
            case 'reward':
                return <Gift className="h-5 w-5 text-orange-500" />;
            case 'success':
                return <Trophy className="h-5 w-5 text-green-500" />;
            case 'warning':
                return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
            case 'error':
                return <X className="h-5 w-5 text-red-500" />;
            default:
                return <Info className="h-5 w-5 text-blue-500" />;
        }
    };

    const getBgColor = () => {
        if (notification.isRead) return 'bg-background/50';
        switch (notification.type) {
            case 'reward': return 'bg-orange-500/10 border-orange-500/20';
            case 'success': return 'bg-green-500/10 border-green-500/20';
            case 'warning': return 'bg-yellow-500/10 border-yellow-500/20';
            case 'error': return 'bg-red-500/10 border-red-500/20';
            default: return 'bg-blue-500/10 border-blue-500/20';
        }
    };

    return (
        <div
            className={cn(
                "relative group flex gap-4 p-4 rounded-xl border transition-all duration-200 hover:shadow-md cursor-pointer mb-3",
                getBgColor(),
                !notification.isRead && "border-l-4"
            )}
            onClick={() => markAsRead(notification.id)}
        >
            <div className={`mt-1 h-10 w-10 rounded-full flex items-center justify-center bg-background shadow-sm shrink-0`}>
                {getIcon()}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                    <h4 className={cn("font-semibold text-sm line-clamp-1", !notification.isRead && "text-primary")}>
                        {notification.title}
                    </h4>
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                    </span>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {notification.body}
                </p>

                {notification.actionUrl && (
                    <Button
                        variant="link"
                        className="p-0 h-auto text-xs font-semibold"
                        onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);

                            // Fix legacy paths for existing notifications
                            let url = notification.actionUrl!;
                            if (url === '/earn') url = '/?tab=earn';
                            else if (url === '/earn/surveys') url = '/?tab=earn';
                            else if (url === '/earn/offerwall') url = '/?tab=earn';
                            else if (url === '/earn/trivia') url = '/?view=trivia';

                            window.location.href = url;
                        }}
                    >
                        View Details →
                    </Button>
                )}
            </div>

            <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                onClick={(e) => {
                    e.stopPropagation();
                    removeNotification(notification.id);
                }}
            >
                <X className="h-3 w-3" />
            </Button>

            {
                !notification.isRead && (
                    <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-primary animate-pulse" />
                )
            }
        </div >
    );
}
