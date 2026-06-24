import bcrypt from "bcrypt";
import { AppDataSource } from "../config/database.js";
import { User, UserRole } from "../entities/User.js";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@admin.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";
const ADMIN_NAME = process.env.ADMIN_NAME || "Admin";

export async function seedAdminIfNotExists(): Promise<void> {
  const userRepository = AppDataSource.getRepository(User);

  const existing = await userRepository.findOne({
    where: { role: UserRole.ADMIN },
  });

  if (existing) {
    return;
  }

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

  await userRepository.save(
    userRepository.create({
      email: ADMIN_EMAIL,
      password: hashedPassword,
      name: ADMIN_NAME,
      role: UserRole.ADMIN,
    }),
  );
}
