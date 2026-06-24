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
import { Room } from "./Room.js";
import { User } from "./User.js";
import { Card } from "./Card.js";

@Entity("boards")
export class Board {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column({ type: "varchar", length: 100 })
  name: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @ManyToOne(() => Room, (room) => room.boards, { onDelete: "CASCADE" })
  room: Relation<Room>;

  @ManyToOne(() => User, (user) => user.boards)
  owner: Relation<User>;

  @OneToMany(() => Card, (card) => card.board)
  cards: Relation<Card[]>;

  @CreateDateColumn({ type: "timestamp" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updatedAt: Date;
}
