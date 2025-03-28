import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';

export interface JWTPayload {
  userId: string;
  email: string;
}

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