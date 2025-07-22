import { Hono } from "hono";
import { notificationController } from "../controllers";

const app = new Hono();

app.post("/", (c) => notificationController.sendNotifications(c));
app.get("/", (c) => notificationController.getNotifications(c));
app.post("/read-all", (c) => notificationController.readNotifications(c));
app.get("/stream", (c) => notificationController.streamNotifications(c));

export default app;
