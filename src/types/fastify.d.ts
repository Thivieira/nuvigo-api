import { JWTPayload } from '@/types/auth';

declare module 'fastify' {
  interface FastifyRequest {
    user: JWTPayload;
  }

  interface RouteHandlerMethod<T = any> {
    (request: FastifyRequest, reply: FastifyReply): Promise<any>;
  }
} 