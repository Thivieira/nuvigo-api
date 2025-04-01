import { FastifyRequest, FastifyReply } from 'fastify';
import { JWTPayload } from '@/types/auth';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JWTPayload;
  }
}

export const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    await request.jwtVerify();
    request.user = request.user as JWTPayload;
  } catch (error) {
    reply.code(401).send({ message: 'Invalid token' });
  }
}; 