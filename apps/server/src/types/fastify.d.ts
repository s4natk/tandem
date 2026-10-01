import "fastify";

declare module "fastify" {
  interface FastifyRequest {
    /** Populated by `requireAuth` preHandler. */
    user?: {
      id: string;
      email: string;
      name: string;
    };
  }
}
