import type { Hono, Env } from "hono";
import type { BlankSchema } from "hono/types";
import notifcationRoute from "./notificationRoute";

export interface RouterMW {
  path: string;
  router: Hono<Env, BlankSchema, "/">;
}

export const routers: RouterMW[] = [
  {
    path: "/api/notifications",
    router: notifcationRoute,
  },
];
