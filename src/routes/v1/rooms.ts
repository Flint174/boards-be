import { FastifyInstance } from "fastify";
import { RoomController } from "../../controllers/room.controller.js";
import {
  createRoomRequestSchema,
  updateRoomSchema,
  roomParamsSchema,
  roomResponseSchema,
  roomsResponseSchema,
  deleteRoomResponseScheme,
  createRoomResponseSchema,
  roomQuerySchema,
} from "../../schemas/room.schema.js";

const roomController = new RoomController();

export async function roomRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRequest", fastify.authenticate);

  fastify.post(
    "/",
    {
      schema: {
        tags: ["Rooms"],
        description: "Создание новой доски",
        security: [{ bearerAuth: [] }],
        body: createRoomRequestSchema,
        response: {
          201: createRoomResponseSchema,
        },
      },
    },
    roomController.create.bind(roomController),
  );

  fastify.get(
    "/",
    {
      schema: {
        tags: ["Rooms"],
        description: "Получение списка всех досок",
        security: [{ bearerAuth: [] }],
        querystring: roomQuerySchema,
        response: {
          200: roomsResponseSchema,
        },
      },
    },
    roomController.getAll.bind(roomController),
  );

  fastify.get(
    "/:id",
    {
      schema: {
        tags: ["Rooms"],
        description: "Получение доски по ID",
        security: [{ bearerAuth: [] }],
        params: roomParamsSchema,
        response: {
          200: roomResponseSchema,
        },
      },
    },
    roomController.getOne.bind(roomController),
  );

  fastify.put(
    "/:id",
    {
      schema: {
        tags: ["Rooms"],
        description: "Обновление доски",
        security: [{ bearerAuth: [] }],
        params: roomParamsSchema,
        body: updateRoomSchema,
        response: {
          200: roomResponseSchema,
        },
      },
    },
    roomController.update.bind(roomController),
  );

  fastify.delete(
    "/:id",
    {
      schema: {
        tags: ["Rooms"],
        description: "Удаление доски",
        security: [{ bearerAuth: [] }],
        params: roomParamsSchema,
        response: {
          204: deleteRoomResponseScheme,
        },
      },
    },
    roomController.delete.bind(roomController),
  );

  fastify.post(
    "/:id/join",
    {
      schema: {
        tags: ["Rooms"],
        description: "Вступление в комнату",
        security: [{ bearerAuth: [] }],
        params: roomParamsSchema,
        response: {
          200: roomResponseSchema,
        },
      },
    },
    roomController.join.bind(roomController),
  );

  fastify.post(
    "/:id/leave",
    {
      schema: {
        tags: ["Rooms"],
        description: "Выход из комнаты",
        security: [{ bearerAuth: [] }],
        params: roomParamsSchema,
        response: {
          200: roomResponseSchema,
        },
      },
    },
    roomController.leave.bind(roomController),
  );
}
