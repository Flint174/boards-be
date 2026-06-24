import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  Relation,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Room } from "./Room.js";
import { Card } from "./Card.js";
import { Board } from "./Board.js";
import { Comment } from "./Comment.js";

export enum UserRole {
  ADMIN = "admin",
  USER = "user",
}

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column({ type: "varchar", unique: true })
  email: string;

  @Column({ type: "varchar" })
  password: string;

  @Column({ type: "varchar", nullable: true })
  refreshToken: string | null;

  @Column({ type: "varchar" })
  name: string;

  @Column({ type: "enum", enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @OneToMany(() => Room, (room) => room.owner)
  rooms: Relation<Room[]>;

  @OneToMany(() => Card, (card) => card.owner)
  cards: Relation<Card[]>;

  @OneToMany(() => Board, (board) => board.owner)
  boards: Relation<Board[]>;

  @OneToMany(() => Comment, (comment) => comment.author)
  comments: Relation<Comment[]>;

  @CreateDateColumn({ type: "timestamp" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updatedAt: Date;
}
