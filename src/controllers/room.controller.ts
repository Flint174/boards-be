import { FastifyRequest, FastifyReply } from "fastify";
import { RoomService } from "../services/room.service.js";
import {
  CreateRoomRequestSchema,
  RoomsResponseSchema,
  RoomResponseSchema,
  UpdateRoomSchema,
  RoomParamsSchema,
  CreateRoomResponseSchema,
  RoomQuerySchema,
} from "../schemas/room.schema.js";
import {
  ERROR_RESPONSE,
  NOT_FOUND_RESPONSE,
  ACCESS_DENIED_RESPONSE,
} from "../constants/responses.js";
import { ERRORS } from "../constants/errors.js";

const roomService = new RoomService();

export class RoomController {
  async create(request: FastifyRequest<{ Body: CreateRoomRequestSchema }>, reply: FastifyReply) {
    try {
      const data = request.body;

      const user = request.user;
      const room = await roomService.createRoom(user.id, data);

      const response: CreateRoomResponseSchema = {
        success: true,
        data: room,
      };

      return reply.status(201).send(response);
    } catch (error) {
      return reply.status(500).send(ERROR_RESPONSE);
    }
  }

  async getAll(
    request: FastifyRequest<{ Querystring: RoomQuerySchema }>,
    reply: FastifyReply,
  ) {
    try {
      const { page, limit, search } = request.query;
      const result = await roomService.getRooms({ page, limit, search });

      const response: RoomsResponseSchema = {
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
      return reply.status(500).send(ERROR_RESPONSE);
    }
  }

  async getOne(request: FastifyRequest<{ Params: RoomParamsSchema }>, reply: FastifyReply) {
    try {
      const { id } = request.params;

      const room = await roomService.getRoomById(id);

      const response: RoomResponseSchema = {
        success: true,
        data: room,
      };

      return reply.send(response);
    } catch (error) {
      if (error instanceof Error && error.message === ERRORS.NOT_FOUND) {
        return reply.status(404).send(NOT_FOUND_RESPONSE);
      }
      return reply.status(500).send(ERROR_RESPONSE);
    }
  }

  async update(
    request: FastifyRequest<{
      Params: RoomParamsSchema;
      Body: UpdateRoomSchema;
    }>,
    reply: FastifyReply,
  ) {
    try {
      const user = request.user;
      const { id } = request.params;
      const data = request.body;

      const room = await roomService.updateRoom(id, user.id, data);

      const response: RoomResponseSchema = {
        success: true,
        data: room,
      };

      return reply.send(response);
    } catch (error) {
      if (error instanceof Error && error.message === ERRORS.NOT_FOUND) {
        return reply.status(404).send(NOT_FOUND_RESPONSE);
      }
      return reply.status(500).send(ERROR_RESPONSE);
    }
  }

  async delete(request: FastifyRequest<{ Params: RoomParamsSchema }>, reply: FastifyReply) {
    try {
      const { id } = request.params;
      const user = request.user;

      await roomService.deleteRoom(id, user.id);

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

  async join(request: FastifyRequest<{ Params: RoomParamsSchema }>, reply: FastifyReply) {
    try {
      const { id } = request.params;
      const user = request.user;

      const room = await roomService.joinRoom(id, user.id);

      const response: RoomResponseSchema = {
        success: true,
        data: room,
      };

      return reply.send(response);
    } catch (error) {
      if (error instanceof Error && error.message === ERRORS.NOT_FOUND) {
        return reply.status(404).send(NOT_FOUND_RESPONSE);
      }
      return reply.status(500).send(ERROR_RESPONSE);
    }
  }

  async leave(request: FastifyRequest<{ Params: RoomParamsSchema }>, reply: FastifyReply) {
    try {
      const { id } = request.params;
      const user = request.user;

      const room = await roomService.leaveRoom(id, user.id);

      const response: RoomResponseSchema = {
        success: true,
        data: room,
      };

      return reply.send(response);
    } catch (error) {
      if (error instanceof Error && error.message === ERRORS.NOT_FOUND) {
        return reply.status(404).send(NOT_FOUND_RESPONSE);
      }
      if (error instanceof Error && error.message === ERRORS.ACCESS_DENIED) {
        return reply.status(403).send({ success: false, error: "Owner cannot leave the room" });
      }
      return reply.status(500).send(ERROR_RESPONSE);
    }
  }
}
