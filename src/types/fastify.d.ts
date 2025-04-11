import { JWTPayload } from '@/utils/jwt.utils';

declare module 'fastify' {
  interface FastifyRequest {
    user?: JWTPayload;
  }
} 