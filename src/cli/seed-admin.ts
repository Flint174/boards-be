import "reflect-metadata";
import "dotenv/config";
import { AppDataSource } from "../config/database.js";
import { seedAdminIfNotExists } from "../init/seed.js";

async function main() {
  await AppDataSource.initialize();
  await seedAdminIfNotExists();
  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error("Failed to seed admin:", err);
  process.exit(1);
});
