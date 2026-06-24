import "fastify";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    user: {
      id: number;
      email: string;
      name: string;
      role: string;
    };
  }
}
