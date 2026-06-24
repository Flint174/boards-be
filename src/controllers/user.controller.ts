import { FastifyRequest, FastifyReply } from "fastify";
import { UserService } from "../services/user.service.js";
import {
  LoginRequestSchema,
  RegisterRequestSchema,
  RegisterResponseSchema,
  RefreshTokenSchema,
  RefreshTokenResponseSchema,
  LoginResponseSchema,
  ProfileResponseSchema,
  LogoutResponseSchema,
  UpdateUserSchema,
  UsersResponseSchema,
  UserParamsSchema,
  UserQuerySchema,
} from "../schemas/user.schema.js";
import {
  ERROR_RESPONSE,
  USER_EXISTS_RESPONSE,
  INVALID_CREDENTIALS_RESPONSE,
  NOT_FOUND_RESPONSE,
  INVALID_REFRESH_TOKEN_RESPONSE,
  ACCESS_DENIED_RESPONSE,
} from "../constants/responses.js";
import { ERRORS } from "../constants/errors.js";
import crypto from "crypto";
import bcrypt from "bcrypt";

const userService = new UserService();

function generateRefreshToken(): string {
  return crypto.randomBytes(40).toString("hex");
}

export class UserController {
  async register(request: FastifyRequest<{ Body: RegisterRequestSchema }>, reply: FastifyReply) {
    try {
      const data = request.body;

      const user = await userService.register(data);

      const rawRefreshToken = generateRefreshToken();
      const hashedRefreshToken = await bcrypt.hash(rawRefreshToken, 10);
      await userService.setRefreshToken(user.id, hashedRefreshToken);

      const accessToken = await reply.jwtSign({
        id: user.id,
        email: user.email,
      });

      const response: RegisterResponseSchema = {
        success: true,
        data: {
          user,
          accessToken,
          refreshToken: rawRefreshToken,
        },
      };

      return reply.status(201).send(response);
    } catch (error) {
      if (error instanceof Error && error.message === ERRORS.USER_EXISTS) {
        return reply.status(409).send(USER_EXISTS_RESPONSE);
      }
      return reply.status(500).send(ERROR_RESPONSE);
    }
  }

  async login(request: FastifyRequest<{ Body: LoginRequestSchema }>, reply: FastifyReply) {
    try {
      const data = request.body;

      const user = await userService.login(data);

      const rawRefreshToken = generateRefreshToken();
      const hashedRefreshToken = await bcrypt.hash(rawRefreshToken, 10);
      await userService.setRefreshToken(user.id, hashedRefreshToken);

      const accessToken = await reply.jwtSign({
        id: user.id,
        email: user.email,
      });

      const response: LoginResponseSchema = {
        success: true,
        data: {
          user,
          accessToken,
          refreshToken: rawRefreshToken,
        },
      };

      return reply.send(response);
    } catch (error) {
      if (error instanceof Error && error.message === ERRORS.INVALID_CREDENTIALS) {
        return reply.status(401).send(INVALID_CREDENTIALS_RESPONSE);
      }
      return reply.status(500).send(ERROR_RESPONSE);
    }
  }

  async getProfile(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = request.user;
      const userData = await userService.getUserById(user.id);

      const response: ProfileResponseSchema = {
        success: true,
        data: userData,
      };

      return reply.send(response);
    } catch (error) {
      if (error instanceof Error && error.message === ERRORS.NOT_FOUND) {
        return reply.status(404).send(NOT_FOUND_RESPONSE);
      }
      return reply.status(500).send(ERROR_RESPONSE);
    }
  }

  async logout(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = request.user;
      await userService.clearRefreshToken(user.id);

      const response: LogoutResponseSchema = {
        success: true,
        message: "Logged out successfully",
      };

      return reply.send(response);
    } catch (error) {
      return reply.status(500).send(ERROR_RESPONSE);
    }
  }

  async refreshToken(request: FastifyRequest<{ Body: RefreshTokenSchema }>, reply: FastifyReply) {
    try {
      const { refreshToken } = request.body;

      const user = await userService.getUserByRefreshToken(refreshToken);

      if (!user) {
        return reply.status(401).send(INVALID_REFRESH_TOKEN_RESPONSE);
      }

      const newRefreshToken = generateRefreshToken();
      const hashedRefreshToken = await bcrypt.hash(newRefreshToken, 10);
      await userService.setRefreshToken(user.id, hashedRefreshToken);

      const accessToken = await reply.jwtSign({
        id: user.id,
        email: user.email,
      });

      const response: RefreshTokenResponseSchema = {
        success: true,
        data: {
          accessToken,
          refreshToken: newRefreshToken,
        },
      };

      return reply.send(response);
    } catch (error) {
      return reply.status(500).send(ERROR_RESPONSE);
    }
  }

  async getAll(
    request: FastifyRequest<{ Querystring: UserQuerySchema }>,
    reply: FastifyReply,
  ) {
    try {
      const { page, limit } = request.query;
      const result = await userService.getUsers({ page, limit });

      const response: UsersResponseSchema = {
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

  async getOne(request: FastifyRequest<{ Params: UserParamsSchema }>, reply: FastifyReply) {
    try {
      const { id } = request.params;

      const userData = await userService.getUserById(id);

      const response: ProfileResponseSchema = {
        success: true,
        data: userData,
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
    request: FastifyRequest<{ Params: UserParamsSchema; Body: UpdateUserSchema }>,
    reply: FastifyReply,
  ) {
    try {
      const user = request.user;
      const { id } = request.params;
      const data = request.body;

      const updated = await userService.updateUser(id, user.id, data);

      const response: ProfileResponseSchema = {
        success: true,
        data: updated,
      };

      return reply.send(response);
    } catch (error) {
      if (error instanceof Error && error.message === ERRORS.NOT_FOUND) {
        return reply.status(404).send(NOT_FOUND_RESPONSE);
      }
      if (error instanceof Error && error.message === ERRORS.ACCESS_DENIED) {
        return reply.status(403).send(ACCESS_DENIED_RESPONSE);
      }
      if (error instanceof Error && error.message === ERRORS.USER_EXISTS) {
        return reply.status(409).send(USER_EXISTS_RESPONSE);
      }
      return reply.status(500).send(ERROR_RESPONSE);
    }
  }
}
