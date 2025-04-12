import { FastifyRequest, FastifyReply } from 'fastify';
import { UserService } from '@/services/user.service';
import { CreateUserDto, UpdateUserDto } from '@/types/user';
import { Prisma } from '@prisma/client';
import { BaseController } from './base.controller';
import { JWTPayload } from '@/types/auth';

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
            error: 'Email já existe',
            code: 'EMAIL_EXISTS',
            details: { email: request.body.email }
          }, 400);
        }
      }
      return this.sendError(reply, this.handleError(error));
    }
  }

  async findAll(request: FastifyRequest & { user: JWTPayload }, reply: FastifyReply) {
    try {
      // Only admin users can list all users
      if (request.user.role !== 'ADMIN') {
        return this.sendError(reply, {
          error: 'Forbidden',
          code: 'FORBIDDEN',
          details: { message: 'Apenas administradores podem listar todos os usuários' }
        }, 403);
      }

      const users = await this.userService.findAll();
      return this.sendSuccess(reply, users);
    } catch (error) {
      return this.sendError(reply, this.handleError(error));
    }
  }

  async findById(request: FastifyRequest<{ Params: { id?: string } }> & { user: JWTPayload }, reply: FastifyReply) {
    try {
      const userId = request.params.id || request.user.userId;
      const user = await this.userService.findById(userId);

      if (!user) {
        return this.sendError(reply, {
          error: 'Usuário não encontrado',
          code: 'USER_NOT_FOUND',
          details: { id: userId }
        }, 404);
      }

      // Only allow admin to view other users or users to view their own profile
      if (request.user.role !== 'ADMIN' && request.user.userId !== user.id) {
        return this.sendError(reply, {
          error: 'Forbidden',
          code: 'FORBIDDEN',
          details: { message: 'Você só pode visualizar seu próprio perfil' }
        }, 403);
      }

      return this.sendSuccess(reply, user);
    } catch (error) {
      return this.sendError(reply, this.handleError(error));
    }
  }

  async getCurrentUser(request: FastifyRequest & { user: JWTPayload }, reply: FastifyReply) {
    try {
      const user = await this.userService.findById(request.user.userId);

      if (!user) {
        return this.sendError(reply, {
          error: 'Usuário não encontrado',
          code: 'USER_NOT_FOUND',
          details: { id: request.user.userId }
        }, 404);
      }

      return this.sendSuccess(reply, user);
    } catch (error) {
      return this.sendError(reply, this.handleError(error));
    }
  }

  async update(request: FastifyRequest<{ Params: { id?: string }, Body: UpdateUserDto }> & { user: JWTPayload }, reply: FastifyReply) {
    try {
      const userId = request.params.id || request.user.userId;
      const user = await this.userService.findById(userId);

      if (!user) {
        return this.sendError(reply, {
          error: 'Usuário não encontrado',
          code: 'USER_NOT_FOUND',
          details: { id: userId }
        }, 404);
      }

      // Only allow admin to update other users or users to update their own profile
      if (request.user.role !== 'ADMIN' && request.user.userId !== user.id) {
        return this.sendError(reply, {
          error: 'Forbidden',
          code: 'FORBIDDEN',
          details: { message: 'Você só pode atualizar seu próprio perfil' }
        }, 403);
      }

      const updatedUser = await this.userService.update(userId, request.body);
      return this.sendSuccess(reply, updatedUser);
    } catch (error) {
      return this.sendError(reply, this.handleError(error));
    }
  }

  async delete(request: FastifyRequest<{ Params: { id?: string } }> & { user: JWTPayload }, reply: FastifyReply) {
    try {
      const userId = request.params.id || request.user.userId;
      const user = await this.userService.findById(userId);

      if (!user) {
        return this.sendError(reply, {
          error: 'Usuário não encontrado',
          code: 'USER_NOT_FOUND',
          details: { id: userId }
        }, 404);
      }

      // Only allow admin to delete other users or users to delete their own profile
      if (request.user.role !== 'ADMIN' && request.user.userId !== user.id) {
        return this.sendError(reply, {
          error: 'Forbidden',
          code: 'FORBIDDEN',
          details: { message: 'Você só pode deletar seu próprio perfil' }
        }, 403);
      }

      await this.userService.delete(userId);
      return this.sendSuccess(reply, { message: 'Usuário deletado com sucesso' });
    } catch (error) {
      return this.sendError(reply, this.handleError(error));
    }
  }
} 