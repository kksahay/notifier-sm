import type { Hono, Env } from "hono";
import type { BlankSchema } from "hono/types";

export interface RouterMW {
  path: string;
  router: Hono<Env, BlankSchema, "/">;
}

export const routers: RouterMW[] = [];
