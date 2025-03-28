import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { verifyToken } from '../utils/jwt.utils';

export const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return reply.code(401).send({ message: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);
    request.user = decoded;
  } catch (error) {
    return reply.code(401).send({ message: 'Invalid token' });
  }
};

export const registerAuthMiddleware = (fastify: FastifyInstance) => {
  fastify.decorateRequest('user', null);
  fastify.addHook('preHandler', authenticate);
}; 