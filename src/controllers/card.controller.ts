import { FastifyRequest, FastifyReply } from "fastify";
import { CardService } from "../services/card.service.js";
import {
  CreateCardRequestSchema,
  UpdateCardSchema,
  CardParamsSchema,
  CardQuerySchema,
  VoteParamsSchema,
  CreateCardResponseSchema,
  CardResponseSchema,
  CardsWithVotedResponseSchema,
  VoteResponseSchema,
} from "../schemas/card.schema.js";
import { ERROR_RESPONSE, NOT_FOUND_RESPONSE, ACCESS_DENIED_RESPONSE } from "../constants/responses.js";
import { ERRORS } from "../constants/errors.js";

const cardService = new CardService();

export class CardController {
  async create(request: FastifyRequest<{ Body: CreateCardRequestSchema }>, reply: FastifyReply) {
    try {
      const data = request.body;
      const user = request.user;

      const card = await cardService.createCard(user.id, data);

      const response: CreateCardResponseSchema = {
        success: true,
        data: card,
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

  async getAll(request: FastifyRequest<{ Querystring: CardQuerySchema }>, reply: FastifyReply) {
    try {
      const { boardId, sort, sortOrder, status, page, limit } = request.query;
      const user = request.user;
      const result = await cardService.getCardsByBoard(boardId, user.id, {
        sort,
        sortOrder,
        status,
        page,
        limit,
      });

      const response: CardsWithVotedResponseSchema = {
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

  async getOne(request: FastifyRequest<{ Params: CardParamsSchema }>, reply: FastifyReply) {
    try {
      const { id } = request.params;
      const user = request.user;

      const card = await cardService.getCardById(id, user.id);

      const response: CardResponseSchema = {
        success: true,
        data: card,
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
      Params: CardParamsSchema;
      Body: UpdateCardSchema;
    }>,
    reply: FastifyReply,
  ) {
    try {
      const user = request.user;
      const { id } = request.params;
      const data = request.body;

      const card = await cardService.updateCard(id, user.id, data);

      const response: CardResponseSchema = {
        success: true,
        data: card,
      };

      return reply.send(response);
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === ERRORS.NOT_FOUND || error.message === ERRORS.ACCESS_DENIED)
      ) {
        return reply.status(404).send(NOT_FOUND_RESPONSE);
      }
      if (error instanceof Error && error.message === ERRORS.ONLY_OWNER_CAN_EDIT) {
        return reply.status(403).send({ success: false, error: "Only card owner can edit" });
      }
      return reply.status(500).send(ERROR_RESPONSE);
    }
  }

  async delete(request: FastifyRequest<{ Params: CardParamsSchema }>, reply: FastifyReply) {
    try {
      const { id } = request.params;
      const user = request.user;

      await cardService.deleteCard(id, user.id);

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

  async vote(request: FastifyRequest<{ Params: VoteParamsSchema }>, reply: FastifyReply) {
    try {
      const { id } = request.params;
      const user = request.user;

      const result = await cardService.voteCard(id, user.id);

      const response: VoteResponseSchema = {
        success: true,
        data: result,
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
}
