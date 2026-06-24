import { FastifyInstance } from "fastify";
import { BoardController } from "../../controllers/board.controller.js";
import {
  createBoardRequestSchema,
  updateBoardSchema,
  boardParamsSchema,
  boardQuerySchema,
  createBoardResponseSchema,
  boardResponseSchema,
  boardsResponseSchema,
  deleteBoardResponseSchema,
} from "../../schemas/board.schema.js";

const boardController = new BoardController();

export async function boardRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRequest", fastify.authenticate);

  fastify.post(
    "/",
    {
      schema: {
        tags: ["Boards"],
        description: "Создание новой доски (любой участник комнаты)",
        security: [{ bearerAuth: [] }],
        body: createBoardRequestSchema,
        response: {
          201: createBoardResponseSchema,
        },
      },
    },
    boardController.create.bind(boardController),
  );

  fastify.get(
    "/",
    {
      schema: {
        tags: ["Boards"],
        description: "Получение списка досок комнаты",
        security: [{ bearerAuth: [] }],
        querystring: boardQuerySchema,
        response: {
          200: boardsResponseSchema,
        },
      },
    },
    boardController.getAll.bind(boardController),
  );

  fastify.get(
    "/:id",
    {
      schema: {
        tags: ["Boards"],
        description: "Получение доски по ID",
        security: [{ bearerAuth: [] }],
        params: boardParamsSchema,
        response: {
          200: boardResponseSchema,
        },
      },
    },
    boardController.getOne.bind(boardController),
  );

  fastify.put(
    "/:id",
    {
      schema: {
        tags: ["Boards"],
        description: "Обновление доски (только владелец)",
        security: [{ bearerAuth: [] }],
        params: boardParamsSchema,
        body: updateBoardSchema,
        response: {
          200: boardResponseSchema,
        },
      },
    },
    boardController.update.bind(boardController),
  );

  fastify.delete(
    "/:id",
    {
      schema: {
        tags: ["Boards"],
        description: "Удаление доски (владелец доски / владелец комнаты / админ)",
        security: [{ bearerAuth: [] }],
        params: boardParamsSchema,
        response: {
          204: deleteBoardResponseSchema,
        },
      },
    },
    boardController.delete.bind(boardController),
  );
}
