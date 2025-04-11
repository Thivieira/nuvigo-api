import { FastifyRequest } from 'fastify';
import { UserRole } from '@prisma/client';

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends FastifyRequest {
  user: JWTPayload;
} 