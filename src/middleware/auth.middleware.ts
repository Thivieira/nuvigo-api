import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { verifyToken } from '@/utils/jwt.utils';
import { JWTPayload } from '@/types/auth';

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
    request.user = decoded;
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
    getter: () => ({ userId: '', email: '' } as JWTPayload),
    setter: (value: JWTPayload) => value,
  });
}; 