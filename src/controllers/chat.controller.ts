import { FastifyRequest, FastifyReply } from 'fastify';
import { ChatService } from '@/services/chat.service';
import { ChatCreate, ChatUpdate } from '@/types/chat';

export class ChatController {
  constructor(private chatService: ChatService) { }

  async createChat(request: FastifyRequest<{ Body: ChatCreate }>, reply: FastifyReply) {
    try {
      const chat = await this.chatService.createChat(request.body);
      return reply.code(201).send(chat);
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to create chat' });
    }
  }

  async getChat(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const chat = await this.chatService.getChatById(request.params.id);
      if (!chat) {
        return reply.code(404).send({ error: 'Chat not found' });
      }
      return reply.send(chat);
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to get chat' });
    }
  }

  async updateChat(
    request: FastifyRequest<{ Params: { id: string }; Body: ChatUpdate }>,
    reply: FastifyReply
  ) {
    try {
      const chat = await this.chatService.updateChat(request.params.id, request.body);
      return reply.send(chat);
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to update chat' });
    }
  }

  async deleteChat(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      await this.chatService.deleteChat(request.params.id);
      return reply.code(204).send();
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to delete chat' });
    }
  }

  async getChatsBySession(
    request: FastifyRequest<{ Params: { sessionId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const chats = await this.chatService.getChatsBySessionId(request.params.sessionId);
      return reply.send(chats);
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to get chats' });
    }
  }
} 