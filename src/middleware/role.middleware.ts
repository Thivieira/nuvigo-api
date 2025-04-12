import { FastifyReply, FastifyRequest } from 'fastify';
import { HttpStatus } from '@/utils/http-status';

export async function isAdmin(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    if (!request.user) {
      return reply.status(HttpStatus.FORBIDDEN).send({
        error: 'Acesso negado',
        code: 'UNAUTHORIZED',
        details: { message: 'Usuário não autenticado' }
      });
    }

    if (request.user.role !== 'ADMIN') {
      return reply.status(HttpStatus.FORBIDDEN).send({
        error: 'Acesso negado',
        code: 'FORBIDDEN',
        details: { message: 'Apenas administradores podem acessar este recurso' }
      });
    }
  } catch (error) {
    return reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_SERVER_ERROR',
      details: { message: 'Ocorreu um erro ao verificar as permissões' }
    });
  }
} 