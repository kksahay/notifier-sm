import { App } from "./App";
import { DatabaseConnection } from "./configs/DatabaseConnection";

const db = new DatabaseConnection();
const app = new App(process.env.PORT as string);

export const client = db.client;

db.connect()
  .then(() => {
    app.listen();
  })
  .catch((error) => {
    console.log(error);
  });
