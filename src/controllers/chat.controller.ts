import { FastifyRequest, FastifyReply } from 'fastify';
import { ChatService } from '@/services/chat.service';
import { CreateChatDto, UpdateChatDto, CreateChatSessionDto } from '@/types/chat';
import { PrismaClient, Prisma } from '@prisma/client';
import { BaseController } from './base.controller';
import { JWTPayload } from '@/types/auth';

const prisma = new PrismaClient();

export class ChatController extends BaseController {
  constructor(private readonly chatService: ChatService) {
    super();
  }

  async createChatMessage(
    request: FastifyRequest<{ Body: CreateChatDto }>,
    reply: FastifyReply
  ) {
    try {
      const { chatSessionId, userId, location, temperature, condition, naturalResponse, metadata } = request.body;

      const chat = await prisma.chat.create({
        data: {
          chatSessionId,
          userId,
          location,
          temperature,
          condition,
          naturalResponse,
          metadata
        },
        include: {
          chatSession: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      return this.sendSuccess(reply, chat, 201);
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          return this.sendError(reply, {
            error: 'Chat message already exists',
            code: 'CHAT_MESSAGE_EXISTS',
            details: error.meta
          }, 409);
        }
        if (error.code === 'P2003') {
          return this.sendError(reply, {
            error: 'Chat session not found',
            code: 'CHAT_SESSION_NOT_FOUND',
            details: { chatSessionId: request.body.chatSessionId }
          }, 404);
        }
      }
      return this.sendError(reply, this.handleError(error));
    }
  }

  async findUserSessions(request: FastifyRequest & { user: JWTPayload }, reply: FastifyReply) {
    try {
      const userId = request.user.userId;
      const sessions = await this.chatService.findSessionsByUserId(userId);
      return this.sendSuccess(reply, sessions);
    } catch (error: any) {
      return this.sendError(reply, this.handleError(error));
    }
  }

  async findSessionById(request: FastifyRequest<{ Params: { sessionId: string } }>, reply: FastifyReply) {
    try {
      const session = await this.chatService.findSessionById(request.params.sessionId);
      if (!session) {
        return this.sendError(reply, {
          error: 'Chat session not found',
          code: 'CHAT_SESSION_NOT_FOUND',
          details: { sessionId: request.params.sessionId }
        }, 404);
      }
      return this.sendSuccess(reply, session);
    } catch (error: any) {
      return this.sendError(reply, this.handleError(error));
    }
  }

  async findChatById(request: FastifyRequest<{ Params: { chatId: string } }>, reply: FastifyReply) {
    try {
      const chat = await this.chatService.findChatById(request.params.chatId);
      if (!chat) {
        return this.sendError(reply, {
          error: 'Chat message not found',
          code: 'CHAT_MESSAGE_NOT_FOUND',
          details: { chatId: request.params.chatId }
        }, 404);
      }
      return this.sendSuccess(reply, chat);
    } catch (error: any) {
      return this.sendError(reply, this.handleError(error));
    }
  }

  async updateChatMessage(
    request: FastifyRequest<{ Params: { chatId: string }; Body: UpdateChatDto }>,
    reply: FastifyReply
  ) {
    try {
      const { chatId } = request.params;
      const { location, temperature, condition, naturalResponse, metadata } = request.body;

      const chat = await prisma.chat.update({
        where: { id: chatId },
        data: {
          location,
          temperature,
          condition,
          naturalResponse,
          metadata
        },
        include: {
          chatSession: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      return this.sendSuccess(reply, chat);
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return this.sendError(reply, {
            error: 'Chat message not found',
            code: 'CHAT_MESSAGE_NOT_FOUND',
            details: { chatId: request.params.chatId }
          }, 404);
        }
      }
      return this.sendError(reply, this.handleError(error));
    }
  }

  async deleteChatMessage(request: FastifyRequest<{ Params: { chatId: string } }>, reply: FastifyReply) {
    try {
      await this.chatService.deleteChat(request.params.chatId);
      return this.sendSuccess(reply, null, 204);
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return this.sendError(reply, {
            error: 'Chat message not found',
            code: 'CHAT_MESSAGE_NOT_FOUND',
            details: { chatId: request.params.chatId }
          }, 404);
        }
      }
      return this.sendError(reply, this.handleError(error));
    }
  }

  async deleteSession(request: FastifyRequest<{ Params: { sessionId: string } }>, reply: FastifyReply) {
    try {
      await this.chatService.deleteSession(request.params.sessionId);
      return this.sendSuccess(reply, null, 204);
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return this.sendError(reply, {
            error: 'Chat session not found',
            code: 'CHAT_SESSION_NOT_FOUND',
            details: { sessionId: request.params.sessionId }
          }, 404);
        }
      }
      return this.sendError(reply, this.handleError(error));
    }
  }
} 