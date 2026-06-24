import { FastifyRequest, FastifyReply } from "fastify";
import { BoardService } from "../services/board.service.js";
import {
  CreateBoardRequestSchema,
  CreateBoardResponseSchema,
  BoardsResponseSchema,
  BoardResponseSchema,
  UpdateBoardSchema,
  BoardParamsSchema,
  BoardQuerySchema,
} from "../schemas/board.schema.js";
import { ERROR_RESPONSE, NOT_FOUND_RESPONSE, ACCESS_DENIED_RESPONSE } from "../constants/responses.js";
import { ERRORS } from "../constants/errors.js";

const boardService = new BoardService();

export class BoardController {
  async create(request: FastifyRequest<{ Body: CreateBoardRequestSchema }>, reply: FastifyReply) {
    try {
      const data = request.body;
      const user = request.user;

      const board = await boardService.createBoard(user.id, data);

      const response: CreateBoardResponseSchema = {
        success: true,
        data: board,
      };

      return reply.status(201).send(response);
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === ERRORS.NOT_FOUND || error.message === ERRORS.ACCESS_DENIED)
      ) {
        return reply.status(404).send(NOT_FOUND_RESPONSE);
      }
      console.error("Board create error:", error);
      return reply.status(500).send(ERROR_RESPONSE);
    }
  }

  async getAll(request: FastifyRequest<{ Querystring: BoardQuerySchema }>, reply: FastifyReply) {
    try {
      const { roomId, page, limit } = request.query;

      const user = request.user;
      const result = await boardService.getBoards(roomId, user.id, { page, limit });

      const response: BoardsResponseSchema = {
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

  async getOne(request: FastifyRequest<{ Params: BoardParamsSchema }>, reply: FastifyReply) {
    try {
      const { id } = request.params;
      const user = request.user;

      const board = await boardService.getBoardById(id, user.id);

      const response: BoardResponseSchema = {
        success: true,
        data: board,
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
      Params: BoardParamsSchema;
      Body: UpdateBoardSchema;
    }>,
    reply: FastifyReply,
  ) {
    try {
      const user = request.user;
      const { id } = request.params;
      const data = request.body;

      const board = await boardService.updateBoard(id, user.id, data);

      const response: BoardResponseSchema = {
        success: true,
        data: board,
      };

      return reply.send(response);
    } catch (error) {
      if (error instanceof Error && error.message === ERRORS.NOT_FOUND_OR_ACCESS_DENIED) {
        return reply.status(404).send(NOT_FOUND_RESPONSE);
      }
      return reply.status(500).send(ERROR_RESPONSE);
    }
  }

  async delete(request: FastifyRequest<{ Params: BoardParamsSchema }>, reply: FastifyReply) {
    try {
      const { id } = request.params;
      const user = request.user;

      await boardService.deleteBoard(id, user.id);

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
