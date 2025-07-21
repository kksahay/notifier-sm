import { client } from "../../server";

export class NotificationQueries {
  async createNotificationQuery({
    type,
    actor_id,
    object_id,
    recipient_ids,
  }: {
    type: "post_created" | "post_liked";
    actor_id: number;
    object_id: number;
    recipient_ids: number[];
  }) {
    const typeRes = await client.query({
      text: `SELECT id FROM notification_types WHERE name = $1`,
      values: [type],
    });
    const type_id = typeRes.rows[0]?.id;
    if (!type_id) throw new Error("Invalid notification type");

    const eventRes = await client.query({
      text: `
      INSERT INTO notification_events (type_id, actor_id, object_id)
      VALUES ($1, $2, $3)
      RETURNING id
    `,
      values: [type_id, actor_id, object_id],
    });
    const event_id = eventRes.rows[0].id;

    if (recipient_ids.length > 0) {
      const valuesClause = recipient_ids
        .map((_, i) => `($1, $${i + 2})`)
        .join(", ");

      const insertRecipientsQuery = {
        text: `
        INSERT INTO notification_recipients (event_id, user_id)
        VALUES ${valuesClause}
      `,
        values: [event_id, ...recipient_ids],
      };

      await client.query(insertRecipientsQuery);
    }

    return { event_id, recipients: recipient_ids };
  }

  async getNotificationsQuery(user_id: number) {
    const query = {
      text: `
      SELECT
        nr.id AS recipient_id,
        ne.id AS event_id,
        nt.name AS type,
        ne.actor_id,
        u.name AS actor_name,
        u.profile_image_url,
        ne.object_id,
        ne.created_at
        FROM notification_recipients nr
        JOIN notification_events ne ON nr.event_id = ne.id
        JOIN notification_types nt ON nt.id = ne.type_id
        JOIN users u ON u.id = ne.actor_id
        WHERE nr.user_id = $1
        ORDER BY ne.created_at DESC
    `,
      values: [user_id],
    };
    const res = await client.query(query);
    return res.rows;
  }

  async readNotificationsQuery(user_id: number) {
    const query = {
      text: `
        UPDATE notification_recipients
        SET read_at = NOW()
        WHERE user_id = $1 AND read_at IS NULL
    `,
      values: [user_id],
    };
    const res = await client.query(query);
    return res.rows;
  }
}
