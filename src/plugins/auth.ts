import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { AppDataSource } from "../config/database.js";
import { User } from "../entities/User.js";

export default fp(async function authPlugin(fastify: FastifyInstance) {
  fastify.decorate("authenticate", async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();

      const user = await AppDataSource.getRepository(User).findOne({
        where: { id: request.user.id },
        select: ["id", "email", "name", "role"],
      });

      if (!user) {
        return reply.status(401).send({
          success: false,
          error: "Unauthorized: User no longer exists",
        });
      }

      request.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      };
    } catch (err) {
      reply.status(401).send({
        success: false,
        error: "Unauthorized: Invalid or missing token",
      });
    }
  });
});
