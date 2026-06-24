import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Relation,
  ManyToMany,
  JoinTable,
} from "typeorm";
import { User } from "./User.js";
import { Board } from "./Board.js";

export enum RoomStatus {
  ACTIVE = "active",
  ARCHIVED = "archived",
}

@Entity("rooms")
export class Room {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column({ type: "varchar", length: 100 })
  name: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "enum", enum: RoomStatus, default: RoomStatus.ACTIVE })
  status: RoomStatus;

  @ManyToOne(() => User, (user) => user.rooms)
  owner: Relation<User>;

  @ManyToMany(() => User)
  @JoinTable()
  users: Relation<User>[];

  @OneToMany(() => Board, (board) => board.room)
  boards: Relation<Board[]>;

  @CreateDateColumn({ type: "timestamp" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updatedAt: Date;
}
