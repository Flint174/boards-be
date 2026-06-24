import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  Relation,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Card } from "./Card.js";
import { User } from "./User.js";

@Entity("comments")
export class Comment {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column({ type: "text" })
  content: string;

  @ManyToOne(() => Card, (card) => card.comments, { onDelete: "CASCADE" })
  card: Relation<Card>;

  @ManyToOne(() => User, (user) => user.comments)
  author: Relation<User>;

  @ManyToOne(() => Comment, (comment) => comment.replies, { nullable: true, onDelete: "SET NULL" })
  parent: Relation<Comment> | null;

  @OneToMany(() => Comment, (comment) => comment.parent)
  replies: Relation<Comment[]>;

  @CreateDateColumn({ type: "timestamp" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updatedAt: Date;
}
