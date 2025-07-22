"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const user_id = 1; // replace with real user ID from auth/session

interface Notification {
  event_id: number;
  type: "post" | "like";
  object_id: number;
  actor_id: number[];
  timestamp: string;
  read: boolean;
  title: string;
  message: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;

const fetchNotifications = async (): Promise<Notification[]> => {
  const response = await fetch(
    `${API_BASE_URL}/api/notifications?user_id=${user_id}`
  );
  if (!response.ok) throw new Error("Failed to fetch notifications");
  const raw = await response.json();

  return raw.map((n: any) => {
    const isPost = n.type === "post";
    return {
      event_id: n.event_id,
      type: n.type,
      object_id: n.object_id,
      actor_id: n.actor_id,
      timestamp: new Date().toISOString(), // or use n.timestamp if provided
      read: n.read, // use server‑provided read flag
      title: isPost ? "New Post" : "Post Liked",
      message: isPost
        ? `User ${n.actor_id[0]} created a new post`
        : `Users ${n.actor_id.join(", ")} liked your post`,
    };
  });
};

const markAllNotificationsAsRead = async (): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ user_id }),
  });
  if (!response.ok) throw new Error("Failed to mark notifications as read");
};

export function NotificationButton() {
  const [isOpen, setIsOpen] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const queryClient = useQueryClient();

  // Fetch notifications
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

  // Mutation to mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.setQueryData(["notifications"], (old: Notification[] = []) =>
        old.map((notification) => ({ ...notification, read: true }))
      );
    },
    onError: (err) => {
      console.error("Failed to mark notifications as read:", err);
    },
  });

  // SSE connection using GET + query param
  useEffect(() => {
    const connectSSE = () => {
      try {
        eventSourceRef.current = new EventSource(
          `${API_BASE_URL}/api/notifications/stream?user_id=${user_id}`
        );

        eventSourceRef.current.onopen = () =>
          console.log("Connected to notification stream");

        eventSourceRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            const notification: Notification = {
              event_id: data.object_id,
              type: data.type,
              object_id: data.object_id,
              actor_id: [data.actor_id],
              timestamp: data.timestamp,
              read: false, // new notifications are unread
              title: data.type === "post" ? "New Post" : "Post Liked",
              message:
                data.type === "post"
                  ? `User ${data.actor_id} created a new post`
                  : `User ${data.actor_id} liked your post`,
            };

            queryClient.setQueryData(
              ["notifications"],
              (old: Notification[] = []) => [notification, ...old]
            );
          } catch (err) {
            console.error("Error parsing notification:", err);
          }
        };

        eventSourceRef.current.onerror = (err) => {
          console.error("SSE connection error:", err);
          setTimeout(() => {
            if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
              connectSSE();
            }
          }, 5000);
        };
      } catch (err) {
        console.error("Error creating EventSource:", err);
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
                <div
                  key={notification.event_id}
                  className="p-3 hover:bg-muted/50"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-none mb-1">
                        {notification.title}
                      </p>
                      <p className="text-sm text-muted-foreground leading-snug">
                        {notification.message}
                      </p>
                    </div>
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
