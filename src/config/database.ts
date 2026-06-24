import "dotenv/config";
import { DataSource } from "typeorm";
import { User } from "../entities/User.js";
import { Room } from "../entities/Room.js";
import { Card } from "../entities/Card.js";
import { Board } from "../entities/Board.js";
import { Comment } from "../entities/Comment.js";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: process.env.NODE_ENV === "development", // Только для разработки!
  logging: process.env.NODE_ENV === "development",
  entities: [User, Room, Card, Board, Comment],
  migrations: ["src/migrations/*.ts"],
  subscribers: [],
});
