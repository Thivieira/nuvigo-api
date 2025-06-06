import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { verifyToken } from '@/utils/jwt.utils';
import { JWTPayload, AuthenticatedRequest } from '@/types/auth';
import { prisma } from '@/lib/prisma';

declare module 'fastify' {
  interface FastifyRequest {
    user: JWTPayload | null;
  }
}

export const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return reply.code(401).send({
        error: 'Unauthorized',
        code: 'AUTH_REQUIRED',
        details: { message: 'Authorization header is required' }
      });
    }

    const token = authHeader.replace('Bearer ', '');

    const decoded = verifyToken(token) as JWTPayload;

    // Get the user from the database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return reply.code(401).send({
        error: 'Unauthorized',
        code: 'USER_NOT_FOUND',
        details: { message: 'User not found' }
      });
    }

    // Add the current role to the request user object
    request.user = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    return;
  } catch (error) {
    console.error('Authentication error:', error);
    return reply.code(401).send({
      error: 'Unauthorized',
      code: 'INVALID_TOKEN',
      details: { message: 'Invalid or expired token' }
    });
  }
};

export const registerAuthMiddleware = (fastify: FastifyInstance) => {
  fastify.decorateRequest('user', null);
  fastify.addHook('onRequest', authenticate);
}; 