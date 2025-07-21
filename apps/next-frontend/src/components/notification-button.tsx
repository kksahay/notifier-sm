"use client";

import { useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

// Configuration for external API
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://your-backend-api.com";

// API functions for external backend
const fetchNotifications = async (): Promise<Notification[]> => {
  const response = await fetch(`${API_BASE_URL}/api/notifications`, {
    headers: {
      "Content-Type": "application/json",
      // Add authentication headers if needed
      // "Authorization": `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error("Failed to fetch notifications");
  return response.json();
};

const markAllNotificationsAsRead = async (): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/notifications/mark-read`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Add authentication headers if needed
      // "Authorization": `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error("Failed to mark notifications as read");
};

export function NotificationButton() {
  const [isOpen, setIsOpen] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const queryClient = useQueryClient();

  // Fetch notifications using TanStack Query
  const {
    data: notifications = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Mutation for marking all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      // Update the cache optimistically
      queryClient.setQueryData(
        ["notifications"],
        (old: Notification[] | undefined) =>
          old?.map((notification) => ({ ...notification, read: true })) || []
      );
    },
    onError: (error) => {
      console.error("Failed to mark notifications as read:", error);
      // Optionally show a toast notification here
    },
  });

  // Set up Server-Sent Events to external backend
  useEffect(() => {
    const connectSSE = () => {
      try {
        // Connect to external SSE endpoint
        eventSourceRef.current = new EventSource(
          `${API_BASE_URL}/api/notifications/stream`
        );

        eventSourceRef.current.onopen = () => {
          console.log("Connected to notification stream");
        };

        eventSourceRef.current.onmessage = (event) => {
          try {
            const newNotification: Notification = JSON.parse(event.data);

            // Update the query cache with the new notification
            queryClient.setQueryData(
              ["notifications"],
              (old: Notification[] | undefined) => {
                const existing = old || [];
                return [newNotification, ...existing];
              }
            );
          } catch (error) {
            console.error("Error parsing notification:", error);
          }
        };

        eventSourceRef.current.onerror = (error) => {
          console.error("SSE connection error:", error);
          // Attempt to reconnect after a delay
          setTimeout(() => {
            if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
              connectSSE();
            }
          }, 5000);
        };
      } catch (error) {
        console.error("Error creating EventSource:", error);
      }
    };

    connectSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [queryClient]);

  const hasUnread = notifications.some((n) => !n.read);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && hasUnread) {
      markAllAsReadMutation.mutate();
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor(
      (now.getTime() - time.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "now";
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  };

  if (error) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="relative h-10 w-10 flex items-center justify-center"
        disabled
      >
        <Bell className="h-5 w-5 text-muted-foreground" />
      </Button>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 flex items-center justify-center"
        >
          <Bell className="h-5 w-5" />
          {hasUnread && (
            <div className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full"></div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b">
          <h3 className="font-medium">Notifications</h3>
        </div>

        <ScrollArea className="h-80">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          ) : (
            <div className="p-1">
              {notifications.map((notification) => (
                <div key={notification.id} className="p-3 hover:bg-muted/50">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-none mb-1">
                        {notification.title}
                      </p>
                      <p className="text-sm text-muted-foreground leading-snug">
                        {notification.message}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {getTimeAgo(notification.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
