import type { Context } from "hono";
import { streamSSE, type SSEStreamingApi } from "hono/streaming";
import { NotificationQueries } from "../utils/queries/NotificationQueries";

export class NotificationController {
  private notificationQueries: NotificationQueries;
  private streams: Map<number, SSEStreamingApi>;

  constructor() {
    this.notificationQueries = new NotificationQueries();
    this.streams = new Map();
  }

  async streamNotifications(c: Context) {
    try {
      const { user_id } = await c.req.json();
      return streamSSE(c, async (stream) => {
        this.streams.set(user_id, stream);
        stream.onAbort(() => {
          this.streams.delete(user_id);
        });
        stream.writeSSE({
          event: "connected",
          data: `Welcome user ${user_id}`,
        });
      });
    } catch (error: any) {
      return c.json(error, 400);
    }
  }
  async sendNotifications(c: Context) {
    try {
      const { type, actor_id, object_id, recipient_ids } = await c.req.json();

      if (!["like", "post"].includes(type)) {
        throw new Error("Invalid notification type");
      }

      await this.notificationQueries.createNotificationQuery({
        type: type as "post" | "like",
        actor_id,
        object_id,
        recipient_ids,
      });

      //SSE (real-time delivery)
      for (const uid of recipient_ids) {
        const stream = this.streams.get(uid);
        if (stream) {
          stream.writeSSE({
            event: "notification",
            data: JSON.stringify({
              type,
              actor_id,
              object_id,
              timestamp: new Date().toISOString(),
            }),
          });
        }
      }

      return c.json({ sent: recipient_ids.length });
    } catch (error: any) {
      return c.json({ error: error.message || "Internal error" }, 400);
    }
  }

  async getNotifications(c: Context) {
    try {
      const userIdParam = c.req.query("user_id");
      if (!userIdParam) {
        return c.json({ error: "Missing user_id" }, 400);
      }
      const user_id = parseInt(userIdParam, 10);
      if (Number.isNaN(user_id)) {
        return c.json({ error: "Invalid user_id" }, 400);
      }

      const notifications =
        await this.notificationQueries.getNotificationsQuery(user_id);

      const payload = notifications.map((n) => ({
        event_id: n.event_id,
        type: n.type,
        object_id: n.object_id,
        actor_id: n.actor_ids as number[],
      }));

      return c.json(payload);
    } catch (error: any) {
      return c.json(error, 400);
    }
  }

  async readNotifications(c: Context) {
    try {
      const { user_id } = await c.req.json();

      if (!user_id || typeof user_id !== "number") {
        return c.json({ error: "Invalid user_id" }, 400);
      }

      const updated = await this.notificationQueries.readNotificationsQuery(
        user_id
      );

      return c.json({
        updated,
      });
    } catch (error: any) {
      return c.json(error, 400);
    }
  }
}
