import { Repository } from "typeorm";
import { AppDataSource } from "../config/database.js";
import { Room } from "../entities/Room.js";
import { User, UserRole } from "../entities/User.js";
import { ERRORS } from "../constants/errors.js";
import { PAGINATION } from "../constants/pagination.js";
import { PaginationQuerySchema } from "../schemas/pagination.schema.js";

export class RoomService {
  private roomRepository: Repository<Room>;
  private userRepository: Repository<User>;

  constructor() {
    this.roomRepository = AppDataSource.getRepository(Room);
    this.userRepository = AppDataSource.getRepository(User);
  }

  async createRoom(ownerId: number, data: { name: string; description?: string; type?: string }) {
    const room = this.roomRepository.create({
      ...data,
      owner: { id: ownerId },
      users: [{ id: ownerId }],
    });
    return await this.roomRepository.save(room);
  }

  async getRooms(params?: { ownerId?: number; userId?: number; search?: string } & PaginationQuerySchema) {
    const { ownerId, userId, search, page = PAGINATION.PAGE, limit = PAGINATION.LIMIT } = params ?? {};

    const qb = this.roomRepository
      .createQueryBuilder("room")
      .leftJoinAndSelect("room.owner", "owner")
      .orderBy("room.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    if (ownerId) {
      qb.andWhere("owner.id = :ownerId", { ownerId });
    }

    if (userId) {
      qb.innerJoin("room.users", "user_filter").andWhere("user_filter.id = :userId", { userId });
    }

    if (search) {
      qb.andWhere(
        `to_tsvector('russian', coalesce(room.name, '') || ' ' || coalesce(room.description, '')) @@ plainto_tsquery('russian', :search)`,
        { search },
      );
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  async getRoomById(id: number, params?: { ownerId?: number; userId?: number }) {
    const { ownerId, userId } = params ?? {};

    const room = await this.roomRepository.findOne({
      where: {
        id,
        ...(ownerId && { owner: { id: ownerId } }),
        ...(userId && { users: { id: userId } }),
      },
      relations: ["owner"],
    });

    if (!room) {
      throw new Error(ERRORS.NOT_FOUND);
    }

    return room;
  }

  async updateRoom(id: number, ownerId: number, data: Partial<Room>) {
    const room = await this.getRoomById(id, { ownerId });
    Object.assign(room, data);
    return await this.roomRepository.save(room);
  }

  async deleteRoom(id: number, userId: number) {
    const room = await this.getRoomById(id);
    const user = await this.userRepository.findOne({ where: { id: userId } });

    const isAdmin = user?.role === UserRole.ADMIN;
    const isRoomOwner = room.owner.id === userId;

    if (!isAdmin && !isRoomOwner) {
      throw new Error(ERRORS.ACCESS_DENIED);
    }

    return await this.roomRepository.remove(room);
  }

  async joinRoom(roomId: number, userId: number) {
    const room = await this.roomRepository.findOne({
      where: { id: roomId },
      relations: ["owner", "users"],
    });

    if (!room) {
      throw new Error(ERRORS.NOT_FOUND);
    }

    const isMember = room.users.some((u) => u.id === userId);
    if (isMember) {
      return room;
    }

    room.users.push({ id: userId } as User);
    return await this.roomRepository.save(room);
  }

  async leaveRoom(roomId: number, userId: number) {
    const room = await this.roomRepository.findOne({
      where: { id: roomId },
      relations: ["owner", "users"],
    });

    if (!room) {
      throw new Error(ERRORS.NOT_FOUND);
    }

    if (room.owner.id === userId) {
      throw new Error(ERRORS.ACCESS_DENIED);
    }

    room.users = room.users.filter((u) => u.id !== userId);
    return await this.roomRepository.save(room);
  }
}
