import { FastifyRequest, FastifyReply } from "fastify";
import { CommentService } from "../services/comment.service.js";
import {
  CreateCommentRequestSchema,
  CreateCommentResponseSchema,
  CommentsResponseSchema,
  CommentResponseSchema,
  UpdateCommentSchema,
  CommentParamsSchema,
  CommentQuerySchema,
} from "../schemas/comment.schema.js";
import {
  ERROR_RESPONSE,
  NOT_FOUND_RESPONSE,
  ACCESS_DENIED_RESPONSE,
} from "../constants/responses.js";
import { ERRORS } from "../constants/errors.js";

const commentService = new CommentService();

export class CommentController {
  async create(request: FastifyRequest<{ Body: CreateCommentRequestSchema }>, reply: FastifyReply) {
    try {
      const data = request.body;
      const user = request.user;

      const comment = await commentService.createComment(user.id, data);

      const response: CreateCommentResponseSchema = {
        success: true,
        data: comment,
      };

      return reply.status(201).send(response);
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === ERRORS.NOT_FOUND || error.message === ERRORS.ACCESS_DENIED)
      ) {
        return reply.status(404).send(NOT_FOUND_RESPONSE);
      }
      return reply.status(500).send(ERROR_RESPONSE);
    }
  }

  async getAll(request: FastifyRequest<{ Querystring: CommentQuerySchema }>, reply: FastifyReply) {
    try {
      const { cardId, page, limit } = request.query;
      const user = request.user;

      const result = await commentService.getCommentsByCard(cardId, user.id, { page, limit });

      const response: CommentsResponseSchema = {
        success: true,
        data: result.items,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
        },
      };

      return reply.send(response);
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === ERRORS.NOT_FOUND || error.message === ERRORS.ACCESS_DENIED)
      ) {
        return reply.status(404).send(NOT_FOUND_RESPONSE);
      }
      return reply.status(500).send(ERROR_RESPONSE);
    }
  }

  async update(
    request: FastifyRequest<{
      Params: CommentParamsSchema;
      Body: UpdateCommentSchema;
    }>,
    reply: FastifyReply,
  ) {
    try {
      const user = request.user;
      const { id } = request.params;
      const data = request.body;

      const comment = await commentService.updateComment(id, user.id, data);

      const response: CommentResponseSchema = {
        success: true,
        data: comment,
      };

      return reply.send(response);
    } catch (error) {
      if (error instanceof Error && error.message === ERRORS.NOT_FOUND) {
        return reply.status(404).send(NOT_FOUND_RESPONSE);
      }
      if (error instanceof Error && error.message === ERRORS.ACCESS_DENIED) {
        return reply.status(403).send(ACCESS_DENIED_RESPONSE);
      }
      return reply.status(500).send(ERROR_RESPONSE);
    }
  }

  async delete(request: FastifyRequest<{ Params: CommentParamsSchema }>, reply: FastifyReply) {
    try {
      const { id } = request.params;
      const user = request.user;

      await commentService.deleteComment(id, user.id);

      return reply.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message === ERRORS.NOT_FOUND) {
        return reply.status(404).send(NOT_FOUND_RESPONSE);
      }
      if (error instanceof Error && error.message === ERRORS.ACCESS_DENIED) {
        return reply.status(403).send(ACCESS_DENIED_RESPONSE);
      }
      return reply.status(500).send(ERROR_RESPONSE);
    }
  }
}
