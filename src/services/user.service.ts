import { IsNull, Not, Repository } from "typeorm";
import { AppDataSource } from "../config/database.js";
import { User } from "../entities/User.js";
import bcrypt from "bcrypt";
import { ERRORS } from "../constants/errors.js";
import { PAGINATION } from "../constants/pagination.js";

export class UserService {
  private userRepository: Repository<User>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
  }

  async register(data: { email: string; password: string; name: string }) {
    // Проверяем существование пользователя
    const existingUser = await this.userRepository.findOne({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error(ERRORS.USER_EXISTS);
    }

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Создаем пользователя
    const user = this.userRepository.create({
      email: data.email,
      password: hashedPassword,
      name: data.name,
    });

    await this.userRepository.save(user);

    // Возвращаем пользователя без пароля
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async login({ email, password }: { email: string; password: string }) {
    // Ищем пользователя
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new Error(ERRORS.INVALID_CREDENTIALS);
    }

    // Проверяем пароль
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error(ERRORS.INVALID_CREDENTIALS);
    }

    // Возвращаем пользователя без пароля
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async getUserById(id: number) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ["rooms"],
    });

    if (!user) {
      throw new Error(ERRORS.NOT_FOUND);
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async setRefreshToken(userId: number, hashedToken: string) {
    await this.userRepository.update(userId, { refreshToken: hashedToken });
  }

  async getUserByRefreshToken(refreshToken: string): Promise<User | null> {
    /** TODO: переложить сравнение токенов на БД
     * Объяснение ситуации:
     * Can't do that with bcrypt — it generates a different hash every time (random salt), so hashing the input again will never match the stored hash. That's why bcrypt.compare exists: it extracts the salt from the stored hash.
     * Options:
     * 1. Keep current — Not(IsNull()) + bcrypt.compare (secure, works)
     * 2. Deterministic hash — SHA-256 for DB lookup (allows direct where query), bcrypt for additional verification if needed
     */

    const users = await this.userRepository.find({
      where: { refreshToken: Not(IsNull()) },
    });

    for (const user of users) {
      if (user.refreshToken && (await bcrypt.compare(refreshToken, user.refreshToken))) {
        return user;
      }
    }

    return null;
  }

  async clearRefreshToken(userId: number) {
    await this.userRepository.update(userId, { refreshToken: null });
  }

  async getUsers(params?: { page?: number; limit?: number }) {
    const { page = PAGINATION.PAGE, limit = PAGINATION.LIMIT } = params ?? {};

    const [items, total] = await this.userRepository.findAndCount({
      select: ["createdAt", "email", "id", "name"],
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async updateUser(id: number, userId: number, data: { name?: string; email?: string }) {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new Error(ERRORS.NOT_FOUND);
    }

    if (user.id !== userId) {
      throw new Error(ERRORS.ACCESS_DENIED);
    }

    if (data.email && data.email !== user.email) {
      const existing = await this.userRepository.findOne({ where: { email: data.email } });
      if (existing) {
        throw new Error(ERRORS.USER_EXISTS);
      }
    }

    Object.assign(user, data);
    await this.userRepository.save(user);

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
