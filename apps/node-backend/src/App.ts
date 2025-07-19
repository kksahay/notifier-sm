import { Hono } from "hono";
import { compress } from "hono/compress";
import { cors } from "hono/cors";
import { prettyJSON } from "hono/pretty-json";
import { routers } from "./routes/index";
import { serve } from "@hono/node-server";

export class App {
  private readonly app;

  constructor(private readonly PORT: string) {
    this.app = new Hono();
    this.middlewares();
    this.routes();
  }

  private middlewares() {
    this.app.use(prettyJSON());
    this.app.use(cors());
    this.app.use(compress());
    this.app.notFound((c) => c.text("Notifier Backend", 404));
  }

  private routes() {
    routers.forEach((router) => {
      this.app.route(router.path, router.router);
    });
  }

  public listen() {
    serve({
      fetch: this.app.fetch,
      port: parseInt(this.PORT),
    });
    console.log(`Server is running on Port: ${this.PORT}`);
  }
}
