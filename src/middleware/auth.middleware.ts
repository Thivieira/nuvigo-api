import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { verifyToken } from '@/utils/jwt.utils';
import { JWTPayload } from '@/types/auth';
import { prisma } from '@/lib/prisma';

declare module 'fastify' {
  interface FastifyRequest {
    user: JWTPayload;
  }
}

export const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
  console.log('Auth middleware called:', {
    path: request.url,
    method: request.method,
    headers: request.headers
  });

  try {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      console.log('No authorization header found');
      return reply.code(401).send({
        error: 'Unauthorized',
        code: 'AUTH_REQUIRED',
        details: { message: 'Authorization header is required' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Token found, attempting to verify');
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
      role: decoded.role // Use the role from the token
    };
    console.log('Token verified successfully');
  } catch (error) {
    console.error('Token verification failed:', error);
    return reply.code(401).send({
      error: 'Unauthorized',
      code: 'INVALID_TOKEN',
      details: { message: 'Invalid or expired token' }
    });
  }
};

export const registerAuthMiddleware = (fastify: FastifyInstance) => {
  fastify.decorateRequest('user', {
    getter: () => ({ userId: '', email: '', role: 'USER' } as JWTPayload),
    setter: (value: JWTPayload) => value,
  });
}; 