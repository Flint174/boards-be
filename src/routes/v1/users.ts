import { FastifyInstance } from "fastify";
import { UserController } from "../../controllers/user.controller.js";
import {
  registerRequestSchema,
  loginRequestSchema,
  registerResponseSchema,
  loginResponseSchema,
  refreshTokenRequestSchema,
  refreshTokenResponseSchema,
  profileResponseSchema,
  logoutResponseSchema,
  updateUserSchema,
  usersResponseSchema,
  userParamsSchema,
  userQuerySchema,
} from "../../schemas/user.schema.js";

const userController = new UserController();

export async function userRoutes(fastify: FastifyInstance) {
  // Публичные маршруты
  fastify.post(
    "/register",
    {
      schema: {
        tags: ["Users"],
        description: "Регистрация нового пользователя",
        body: registerRequestSchema,
        response: {
          201: registerResponseSchema,
        },
      },
    },
    userController.register.bind(userController),
  );

  fastify.post(
    "/login",
    {
      schema: {
        tags: ["Users"],
        description: "Вход пользователя в систему",
        body: loginRequestSchema,
        response: {
          200: loginResponseSchema,
        },
      },
    },
    userController.login.bind(userController),
  );

  fastify.post(
    "/refresh-token",
    {
      schema: {
        tags: ["Users"],
        description: "Обновление access токена с помощью refresh токена",
        body: refreshTokenRequestSchema,
        response: {
          200: refreshTokenResponseSchema,
        },
      },
    },
    userController.refreshToken.bind(userController),
  );

  // Защищенные маршруты
  fastify.register(async function protectedRoutes(scopedInstance: FastifyInstance) {
    scopedInstance.addHook("onRequest", scopedInstance.authenticate);

    scopedInstance.get(
      "/profile",
      {
        schema: {
          tags: ["Users"],
          description: "Получение профиля текущего пользователя",
          security: [{ bearerAuth: [] }],
          response: {
            200: profileResponseSchema,
          },
        },
      },
      userController.getProfile.bind(userController),
    );

    scopedInstance.get(
      "/",
      {
        schema: {
          tags: ["Users"],
          description: "Получение списка всех пользователей",
          security: [{ bearerAuth: [] }],
          querystring: userQuerySchema,
          response: {
            200: usersResponseSchema,
          },
        },
      },
      userController.getAll.bind(userController),
    );

    scopedInstance.get(
      "/:id",
      {
        schema: {
          tags: ["Users"],
          description: "Получение пользователя по ID",
          security: [{ bearerAuth: [] }],
          params: userParamsSchema,
          response: {
            200: profileResponseSchema,
          },
        },
      },
      userController.getOne.bind(userController),
    );

    scopedInstance.put(
      "/:id",
      {
        schema: {
          tags: ["Users"],
          description: "Обновление профиля пользователя",
          security: [{ bearerAuth: [] }],
          params: userParamsSchema,
          body: updateUserSchema,
          response: {
            200: profileResponseSchema,
          },
        },
      },
      userController.update.bind(userController),
    );

    scopedInstance.post(
      "/logout",
      {
        schema: {
          tags: ["Users"],
          description: "Выход пользователя из системы",
          security: [{ bearerAuth: [] }],
          response: {
            200: logoutResponseSchema,
          },
        },
      },
      userController.logout.bind(userController),
    );
  });
}
