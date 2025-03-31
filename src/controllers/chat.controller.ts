import { FastifyRequest, FastifyReply } from 'fastify';
import { ChatService } from '@/services/chat.service';
import { CreateChatDto, UpdateChatDto } from '@/types/chat';
import { Prisma } from '@prisma/client';
import { BaseController } from './base.controller';

export class ChatController extends BaseController {
  constructor(private readonly chatService: ChatService) {
    super();
  }

  async create(request: FastifyRequest<{ Body: CreateChatDto }>, reply: FastifyReply) {
    try {
      const chat = await this.chatService.create(request.body);
      return this.sendSuccess(reply, chat, 201);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          return this.sendError(reply, {
            error: 'User not found',
            code: 'USER_NOT_FOUND',
            details: { userId: request.body.userId }
          }, 400);
        }
      }
      return this.sendError(reply, this.handleError(error));
    }
  }

  async findAll(request: FastifyRequest, reply: FastifyReply) {
    try {
      const chats = await this.chatService.findAll();
      return this.sendSuccess(reply, chats);
    } catch (error) {
      return this.sendError(reply, this.handleError(error));
    }
  }

  async findById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const chat = await this.chatService.findById(request.params.id);
      if (!chat) {
        return this.sendError(reply, {
          error: 'Chat not found',
          code: 'CHAT_NOT_FOUND',
          details: { id: request.params.id }
        }, 404);
      }
      return this.sendSuccess(reply, chat);
    } catch (error) {
      return this.sendError(reply, this.handleError(error));
    }
  }

  async findByUserId(request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) {
    try {
      const chats = await this.chatService.findByUserId(request.params.userId);
      return this.sendSuccess(reply, chats);
    } catch (error) {
      return this.sendError(reply, this.handleError(error));
    }
  }

  async update(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateChatDto }>,
    reply: FastifyReply
  ) {
    try {
      const chat = await this.chatService.update(request.params.id, request.body);
      return this.sendSuccess(reply, chat);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return this.sendError(reply, {
            error: 'Chat not found',
            code: 'CHAT_NOT_FOUND',
            details: { id: request.params.id }
          }, 404);
        }
      }
      return this.sendError(reply, this.handleError(error));
    }
  }

  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      await this.chatService.delete(request.params.id);
      return this.sendSuccess(reply, null, 204);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return this.sendError(reply, {
            error: 'Chat not found',
            code: 'CHAT_NOT_FOUND',
            details: { id: request.params.id }
          }, 404);
        }
      }
      return this.sendError(reply, this.handleError(error));
    }
  }
} 