'use client'

import { useEffect, useState } from 'react'
import { Bell, CheckCheck, Trash2, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useNotificationStore } from '@/lib/notificationStore'
import { NotificationItem } from './NotificationItem'
import NotificationService from '@/services/notificationService'

export function NotificationCenter() {
    const {
        notifications,
        unreadCount,
        markAllAsRead,
        clearAll
    } = useNotificationStore()

    const [isOpen, setIsOpen] = useState(false)

    // Initialize service on mount
    useEffect(() => {
        NotificationService.init();

        // Listen for custom event to open center
        const handleOpen = () => setIsOpen(true)
        window.addEventListener('open-notifications', handleOpen)
        return () => window.removeEventListener('open-notifications', handleOpen)
    }, [])

    const unreadNotifications = notifications.filter(n => !n.isRead)
    const rewardNotifications = notifications.filter(n => n.type === 'reward' || n.type === 'success')

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:w-[400px] p-0 flex flex-col bg-background/95 backdrop-blur-xl border-l">
                <SheetHeader className="p-4 border-b">
                    <div className="flex items-center justify-between">
                        <SheetTitle className="flex items-center gap-2">
                            Notifications
                            <Badge variant="secondary" className="rounded-full">
                                {unreadCount} New
                            </Badge>
                        </SheetTitle>
                        <div className="flex gap-3">
                            <Button
                                variant="ghost"
                                size="icon"
                                title="Mark all as read"
                                onClick={() => markAllAsRead()}
                                disabled={unreadCount === 0}
                            >
                                <CheckCheck className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                title="Clear all"
                                onClick={() => clearAll()}
                                disabled={notifications.length === 0}
                                className="mr-6"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </SheetHeader>

                <Tabs defaultValue="all" className="flex-1 flex flex-col">
                    <div className="px-4 pt-2">
                        <TabsList className="w-full grid grid-cols-3">
                            <TabsTrigger value="all">All</TabsTrigger>
                            <TabsTrigger value="unread">Unread</TabsTrigger>
                            <TabsTrigger value="rewards">Rewards</TabsTrigger>
                        </TabsList>
                    </div>

                    <ScrollArea className="flex-1 px-4 py-4">
                        <TabsContent value="all" className="m-0 space-y-4">
                            {notifications.length === 0 ? (
                                <EmptyState />
                            ) : (
                                notifications.map(notification => (
                                    <NotificationItem key={notification.id} notification={notification} />
                                ))
                            )}
                        </TabsContent>

                        <TabsContent value="unread" className="m-0 space-y-4">
                            {unreadNotifications.length === 0 ? (
                                <EmptyState message="No unread notifications" />
                            ) : (
                                unreadNotifications.map(notification => (
                                    <NotificationItem key={notification.id} notification={notification} />
                                ))
                            )}
                        </TabsContent>

                        <TabsContent value="rewards" className="m-0 space-y-4">
                            {rewardNotifications.length === 0 ? (
                                <EmptyState message="No rewards yet" />
                            ) : (
                                rewardNotifications.map(notification => (
                                    <NotificationItem key={notification.id} notification={notification} />
                                ))
                            )}
                        </TabsContent>
                    </ScrollArea>
                </Tabs>
            </SheetContent>
        </Sheet>
    )
}

function EmptyState({ message = "You're all caught up!" }: { message?: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <div className="bg-muted/50 p-4 rounded-full mb-4">
                <Bell className="h-8 w-8 opacity-50" />
            </div>
            <p>{message}</p>
        </div>
    )
}
