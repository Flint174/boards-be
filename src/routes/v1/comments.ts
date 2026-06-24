import { FastifyInstance } from "fastify";
import { CommentController } from "../../controllers/comment.controller.js";
import {
  createCommentRequestSchema,
  updateCommentSchema,
  commentParamsSchema,
  commentQuerySchema,
  createCommentResponseSchema,
  commentResponseSchema,
  commentsResponseSchema,
  deleteCommentResponseSchema,
} from "../../schemas/comment.schema.js";

const commentController = new CommentController();

export async function commentRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRequest", fastify.authenticate);

  fastify.post(
    "/",
    {
      schema: {
        tags: ["Comments"],
        description: "Добавление комментария к карточке",
        security: [{ bearerAuth: [] }],
        body: createCommentRequestSchema,
        response: {
          201: createCommentResponseSchema,
        },
      },
    },
    commentController.create.bind(commentController),
  );

  fastify.get(
    "/",
    {
      schema: {
        tags: ["Comments"],
        description: "Получение списка комментариев карточки",
        security: [{ bearerAuth: [] }],
        querystring: commentQuerySchema,
        response: {
          200: commentsResponseSchema,
        },
      },
    },
    commentController.getAll.bind(commentController),
  );

  fastify.put(
    "/:id",
    {
      schema: {
        tags: ["Comments"],
        description: "Редактирование комментария (только автор)",
        security: [{ bearerAuth: [] }],
        params: commentParamsSchema,
        body: updateCommentSchema,
        response: {
          200: commentResponseSchema,
        },
      },
    },
    commentController.update.bind(commentController),
  );

  fastify.delete(
    "/:id",
    {
      schema: {
        tags: ["Comments"],
        description: "Удаление комментария (автор / владелец карточки / владелец доски / админ)",
        security: [{ bearerAuth: [] }],
        params: commentParamsSchema,
        response: {
          204: deleteCommentResponseSchema,
        },
      },
    },
    commentController.delete.bind(commentController),
  );
}
