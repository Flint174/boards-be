import { Repository } from "typeorm";
import { AppDataSource } from "../config/database.js";
import { Board } from "../entities/Board.js";
import { Room } from "../entities/Room.js";
import { User, UserRole } from "../entities/User.js";
import { ERRORS } from "../constants/errors.js";
import { PAGINATION } from "../constants/pagination.js";

export class BoardService {
  private boardRepository: Repository<Board>;
  private roomRepository: Repository<Room>;
  private userRepository: Repository<User>;

  constructor() {
    this.boardRepository = AppDataSource.getRepository(Board);
    this.roomRepository = AppDataSource.getRepository(Room);
    this.userRepository = AppDataSource.getRepository(User);
  }

  async createBoard(ownerId: number, data: { name: string; description?: string; roomId: number }) {
    const room = await this.roomRepository.findOne({
      where: { id: data.roomId },
      relations: ["users"],
    });

    if (!room) {
      throw new Error(ERRORS.NOT_FOUND);
    }

    const isMember = room.users.some((u) => u.id === ownerId);
    if (!isMember) {
      throw new Error(ERRORS.ACCESS_DENIED);
    }

    const board = this.boardRepository.create({
      name: data.name,
      description: data.description,
      room: { id: data.roomId },
      owner: { id: ownerId },
    });

    const savedBoard = await this.boardRepository.save(board);

    const saved = await this.boardRepository.findOne({
      where: { id: savedBoard.id },
      relations: ["owner"],
    });

    if (!saved) {
      throw new Error(ERRORS.NOT_FOUND_AFTER_SAVE);
    }

    return saved;
  }

  async getBoards(roomId: number, userId: number, params?: { page?: number; limit?: number }) {
    const { page = PAGINATION.PAGE, limit = PAGINATION.LIMIT } = params ?? {};

    const room = await this.roomRepository.findOne({
      where: { id: roomId },
      relations: ["users"],
    });

    if (!room) {
      throw new Error(ERRORS.NOT_FOUND);
    }

    const isMember = room.users.some((u) => u.id === userId);
    if (!isMember) {
      throw new Error(ERRORS.ACCESS_DENIED);
    }

    const [items, total] = await this.boardRepository.findAndCount({
      where: { room: { id: roomId } },
      relations: ["owner"],
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async getBoardById(id: number, userId: number) {
    const board = await this.boardRepository.findOne({
      where: { id },
      relations: ["owner", "room", "room.users"],
    });

    if (!board) {
      throw new Error(ERRORS.NOT_FOUND);
    }

    const isMember = board.room.users.some((u) => u.id === userId);
    if (!isMember) {
      throw new Error(ERRORS.ACCESS_DENIED);
    }

    return board;
  }

  async updateBoard(id: number, ownerId: number, data: Partial<Board>) {
    const board = await this.boardRepository.findOne({
      where: { id, owner: { id: ownerId } },
      relations: ["owner"],
    });

    if (!board) {
      throw new Error(ERRORS.NOT_FOUND_OR_ACCESS_DENIED);
    }

    Object.assign(board, data);
    return await this.boardRepository.save(board);
  }

  async deleteBoard(id: number, userId: number) {
    const board = await this.boardRepository.findOne({
      where: { id },
      relations: ["owner", "room", "room.owner", "room.users"],
    });

    if (!board) {
      throw new Error(ERRORS.NOT_FOUND);
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });

    const isAdmin = user?.role === UserRole.ADMIN;
    const isBoardOwner = board.owner.id === userId;
    const isRoomOwner = board.room.owner.id === userId;

    if (!isAdmin && !isBoardOwner && !isRoomOwner) {
      throw new Error(ERRORS.ACCESS_DENIED);
    }

    return await this.boardRepository.remove(board);
  }
}
