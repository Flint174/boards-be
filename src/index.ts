import "reflect-metadata";
import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import fastifyMultipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import dotenv from "dotenv";
import path from "node:path";

// Загрузка переменных окружения
dotenv.config();

import { AppDataSource } from "./config/database.js";
import { seedAdminIfNotExists } from "./init/seed.js";
import authPlugin from "./plugins/auth.js";
import { roomRoutes } from "./routes/v1/rooms.js";
import { userRoutes } from "./routes/v1/users.js";
import { cardRoutes } from "./routes/v1/cards.js";
import { boardRoutes } from "./routes/v1/boards.js";
import { commentRoutes } from "./routes/v1/comments.js";
import { fileRoutes } from "./routes/v1/files.js";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import {
  MISSING_AUTH_HEADER_RESPONSE,
  TOKEN_EXPIRED_RESPONSE,
  INVALID_TOKEN_RESPONSE,
} from "./constants/responses.js";

const host = process.env.HOST || (process.env.DOCKER ? "0.0.0.0" : "localhost");
const swaggerHost = process.env.SWAGGER_HOST || "localhost";
const port = parseInt(process.env.PORT || "3000");

const fastify = Fastify({
  logger: process.env.NODE_ENV !== "production",
}).withTypeProvider<ZodTypeProvider>();

fastify.setValidatorCompiler(validatorCompiler);
fastify.setSerializerCompiler(serializerCompiler);

// Register plugins
fastify.register(cors, {
  origin: true,
  credentials: true,
});

fastify.register(jwt, {
  secret: process.env.JWT_SECRET || "default-secret-change-me-in-production",
  sign: {
    expiresIn: process.env.JWT_LIFETIME || "15m",
  },
});

fastify.register(authPlugin);

// File upload & static serving
fastify.register(fastifyMultipart, {
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
});

fastify.register(fastifyStatic, {
  root: path.join(process.cwd(), "public"),
  prefix: "/uploads/",
});

// Register Swagger
fastify.register(swagger, {
  openapi: {
    info: {
      title: "Boards API",
      description: "API documentation for Boards",
      version: "1.0.0",
    },
    servers: [
      {
        url: `http://${swaggerHost}:${port}`,
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  transform: jsonSchemaTransform,
});

fastify.register(swaggerUi, {
  routePrefix: "/docs",
  uiConfig: {
    docExpansion: "list",
    deepLinking: false,
  },
});

// Register routes
fastify.register(userRoutes, { prefix: "/api/v1/users" });
fastify.register(roomRoutes, { prefix: "/api/v1/rooms" });
fastify.register(cardRoutes, { prefix: "/api/v1/cards" });
fastify.register(boardRoutes, { prefix: "/api/v1/boards" });
fastify.register(commentRoutes, { prefix: "/api/v1/comments" });
fastify.register(fileRoutes, { prefix: "/api/v1/files" });

// Health check
fastify.get("/health", async () => {
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  };
});

// Global error handler
fastify.setErrorHandler<{
  code: string;
  statusCode: number;
  validation: object[];
  error: Error;
}>((error, request, reply) => {
  fastify.log.error(error);

  // JWT errors
  if (error.code === "FST_JWT_NO_AUTHORIZATION_IN_HEADER") {
    return reply.status(401).send(MISSING_AUTH_HEADER_RESPONSE);
  }

  if (error.code === "FST_JWT_AUTHORIZATION_TOKEN_EXPIRED") {
    return reply.status(401).send(TOKEN_EXPIRED_RESPONSE);
  }

  if (error.code === "FST_JWT_AUTHORIZATION_TOKEN_INVALID") {
    return reply.status(401).send(INVALID_TOKEN_RESPONSE);
  }

  const { statusCode, validation, code } = error;

  reply.status(statusCode).send({ success: false, error: code, validation });
});

// Start server
const start = async () => {
  try {
    await AppDataSource.initialize();
    console.log("✅ Database connected");

    // Create uuid extension if not exists
    await AppDataSource.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // GIN index for full-text search on rooms
    await AppDataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_room_search_tsv
      ON rooms USING GIN (
        to_tsvector('russian', coalesce(name, '') || ' ' || coalesce(description, ''))
      );
    `);

    // Seed default admin user
    await seedAdminIfNotExists();

    await fastify.listen({ port, host });
    console.log(`🚀 Server running on http://localhost:${port}`);
    console.log(`📚 Swagger docs at http://localhost:${port}/docs`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
