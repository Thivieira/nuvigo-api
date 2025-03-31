import { FastifyReply } from 'fastify';
import { ErrorResponse } from '@/types/common';

export abstract class BaseController {
  protected sendSuccess<T>(reply: FastifyReply, data: T, statusCode = 200) {
    return reply.status(statusCode).send(data);
  }

  protected sendError(reply: FastifyReply, error: ErrorResponse, statusCode = 500) {
    return reply.status(statusCode).send(error);
  }

  protected handleError(error: unknown): ErrorResponse {
    if (error instanceof Error) {
      return {
        error: error.message,
        code: error.name,
        details: error.cause ? { cause: error.cause } : undefined,
      };
    }

    return {
      error: 'An unexpected error occurred',
      code: 'INTERNAL_SERVER_ERROR',
      details: { originalError: error },
    };
  }
} 