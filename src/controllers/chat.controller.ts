import { FastifyRequest, FastifyReply } from 'fastify';
import { ChatService } from '../services/chat.service';
import { CreateChatDto, UpdateChatDto } from '../types/chat';
import { Prisma } from '@prisma/client';

const chatService = new ChatService();

export class ChatController {
  async create(request: FastifyRequest<{ Body: CreateChatDto }>, reply: FastifyReply) {
    try {
      const chat = await chatService.create(request.body);
      return reply.status(201).send(chat);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          return reply.status(400).send({ error: 'User not found' });
        }
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }

  async findAll(request: FastifyRequest, reply: FastifyReply) {
    try {
      const chats = await chatService.findAll();
      return reply.send(chats);
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }

  async findById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const chat = await chatService.findById(request.params.id);
      if (!chat) {
        return reply.status(404).send({ error: 'Chat not found' });
      }
      return reply.send(chat);
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }

  async findByUserId(request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) {
    try {
      const chats = await chatService.findByUserId(request.params.userId);
      return reply.send(chats);
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }

  async update(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateChatDto }>,
    reply: FastifyReply
  ) {
    try {
      const chat = await chatService.update(request.params.id, request.body);
      return reply.send(chat);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return reply.status(404).send({ error: 'Chat not found' });
        }
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }

  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      await chatService.delete(request.params.id);
      return reply.status(204).send();
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return reply.status(404).send({ error: 'Chat not found' });
        }
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }
} 