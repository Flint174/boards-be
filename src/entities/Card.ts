import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
  Relation,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./User.js";
import { Board } from "./Board.js";
import { Comment } from "./Comment.js";

export enum CardStatus {
  NEW = "new",
  IN_PROGRESS = "in_progress",
  DONE = "done",
  REJECTED = "rejected",
}

@Entity("cards")
export class Card {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column({ type: "varchar", length: 255 })
  title: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "enum", enum: CardStatus, default: CardStatus.NEW })
  status: CardStatus;

  @Column({ type: "int", default: 0 })
  order: number;

  @Column({ type: "int", default: 0 })
  votesCount: number;

  @Column({ type: "int", default: 0 })
  commentsCount: number;

  @ManyToOne(() => User, (user) => user.cards)
  owner: Relation<User>;

  @ManyToOne(() => Board, (board) => board.cards, { onDelete: "CASCADE" })
  board: Relation<Board>;

  @OneToMany(() => Comment, (comment) => comment.card)
  comments: Relation<Comment[]>;

  @ManyToMany(() => User)
  @JoinTable()
  voters: Relation<User[]>;

  @CreateDateColumn({ type: "timestamp" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updatedAt: Date;
}
