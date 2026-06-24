import { FastifyInstance } from "fastify";
import { CardController } from "../../controllers/card.controller.js";
import {
  createCardRequestSchema,
  updateCardSchema,
  cardParamsSchema,
  cardQuerySchema,
  voteParamsSchema,
  createCardResponseSchema,
  cardResponseSchema,
  cardsResponseSchema,
  voteResponseSchema,
  deleteCardResponseSchema,
} from "../../schemas/card.schema.js";

const cardController = new CardController();

export async function cardRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRequest", fastify.authenticate);

  fastify.post(
    "/",
    {
      schema: {
        tags: ["Cards"],
        description: "Создание новой карточки на доске",
        security: [{ bearerAuth: [] }],
        body: createCardRequestSchema,
        response: {
          201: createCardResponseSchema,
        },
      },
    },
    cardController.create.bind(cardController),
  );

  fastify.get(
    "/",
    {
      schema: {
        tags: ["Cards"],
        description: "Получение списка карточек доски с сортировкой и фильтрацией",
        security: [{ bearerAuth: [] }],
        querystring: cardQuerySchema,
        response: {
          200: cardsResponseSchema,
        },
      },
    },
    cardController.getAll.bind(cardController),
  );

  fastify.get(
    "/:id",
    {
      schema: {
        tags: ["Cards"],
        description: "Получение карточки по ID",
        security: [{ bearerAuth: [] }],
        params: cardParamsSchema,
        response: {
          200: cardResponseSchema,
        },
      },
    },
    cardController.getOne.bind(cardController),
  );

  fastify.put(
    "/:id",
    {
      schema: {
        tags: ["Cards"],
        description: "Обновление карточки (только владелец)",
        security: [{ bearerAuth: [] }],
        params: cardParamsSchema,
        body: updateCardSchema,
        response: {
          200: cardResponseSchema,
        },
      },
    },
    cardController.update.bind(cardController),
  );

  fastify.delete(
    "/:id",
    {
      schema: {
        tags: ["Cards"],
        description: "Удаление карточки",
        security: [{ bearerAuth: [] }],
        params: cardParamsSchema,
        response: {
          204: deleteCardResponseSchema,
        },
      },
    },
    cardController.delete.bind(cardController),
  );

  fastify.post(
    "/:id/vote",
    {
      schema: {
        tags: ["Cards"],
        description: "Поставить/снять голос за карточку (любой участник комнаты, 1 раз)",
        security: [{ bearerAuth: [] }],
        params: voteParamsSchema,
        response: {
          200: voteResponseSchema,
        },
      },
    },
    cardController.vote.bind(cardController),
  );
}
