import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { verifyToken } from '@/utils/jwt.utils';

interface JWTPayload {
  userId: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user: JWTPayload;
  }
}

export const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return reply.code(401).send({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);
    request.user = decoded;
  } catch (error) {
    return reply.code(401).send({ error: 'Invalid token' });
  }
};

export const registerAuthMiddleware = (fastify: FastifyInstance) => {
  fastify.decorateRequest('user', {
    getter: () => ({ userId: '' }),
    setter: (value: JWTPayload) => value,
  });
}; 