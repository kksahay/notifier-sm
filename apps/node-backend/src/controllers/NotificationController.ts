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
      return c.json(error, 400);
    }
  }

  async getNotifications(c: Context) {
    try {
      const user_id = c.req.query("user_id");
    } catch (error: any) {
      return c.json(error, 400);
    }
  }

  async readNotifications(c: Context) {
    try {
      const { user_id } = await c.req.json();
    } catch (error: any) {
      return c.json(error, 400);
    }
  }
}
