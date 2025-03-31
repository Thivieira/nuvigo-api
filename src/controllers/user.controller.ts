import { FastifyRequest, FastifyReply } from 'fastify';
import { UserService } from '@/services/user.service';
import { CreateUserDto, UpdateUserDto } from '@/types/user';
import { Prisma } from '@prisma/client';
import { BaseController } from './base.controller';

export class UserController extends BaseController {
  constructor(private readonly userService: UserService) {
    super();
  }

  async create(request: FastifyRequest<{ Body: CreateUserDto }>, reply: FastifyReply) {
    try {
      const user = await this.userService.create(request.body);
      return this.sendSuccess(reply, user, 201);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          return this.sendError(reply, {
            error: 'Email already exists',
            code: 'EMAIL_EXISTS',
            details: { email: request.body.email }
          }, 400);
        }
      }
      return this.sendError(reply, this.handleError(error));
    }
  }

  async findAll(request: FastifyRequest, reply: FastifyReply) {
    try {
      const users = await this.userService.findAll();
      return this.sendSuccess(reply, users);
    } catch (error) {
      return this.sendError(reply, this.handleError(error));
    }
  }

  async findById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const user = await this.userService.findById(request.params.id);
      if (!user) {
        return this.sendError(reply, {
          error: 'User not found',
          code: 'USER_NOT_FOUND',
          details: { id: request.params.id }
        }, 404);
      }
      return this.sendSuccess(reply, user);
    } catch (error) {
      return this.sendError(reply, this.handleError(error));
    }
  }

  async update(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateUserDto }>,
    reply: FastifyReply
  ) {
    try {
      const user = await this.userService.update(request.params.id, request.body);
      return this.sendSuccess(reply, user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return this.sendError(reply, {
            error: 'User not found',
            code: 'USER_NOT_FOUND',
            details: { id: request.params.id }
          }, 404);
        }
        if (error.code === 'P2002') {
          return this.sendError(reply, {
            error: 'Email already exists',
            code: 'EMAIL_EXISTS',
            details: { email: request.body.email }
          }, 400);
        }
      }
      return this.sendError(reply, this.handleError(error));
    }
  }

  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      await this.userService.delete(request.params.id);
      return this.sendSuccess(reply, null, 204);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return this.sendError(reply, {
            error: 'User not found',
            code: 'USER_NOT_FOUND',
            details: { id: request.params.id }
          }, 404);
        }
      }
      return this.sendError(reply, this.handleError(error));
    }
  }
} 