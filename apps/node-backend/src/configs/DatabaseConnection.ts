import { Client } from "pg";

export class DatabaseConnection {
  public client: Client;
  constructor() {
    this.client = new Client({
      connectionString: process.env.DB_URI,
      ssl: true,
    });
  }
  async connect() {
    try {
      await this.client.connect();
      console.log("Database connected successfully");
    } catch (error) {
      console.error("Database connection failed", error);
    }
  }
}
