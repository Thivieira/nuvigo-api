import { FastifyRequest, RouteGenericInterface } from 'fastify';
import { UserRole } from '@prisma/generated/client';

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface AuthenticatedRequest<T extends RouteGenericInterface = RouteGenericInterface> extends FastifyRequest<T> {
  user: JWTPayload;
} 