import { FastifyRequest, FastifyReply } from 'fastify';
import { ChatService } from '@/services/chat.service';
import { ChatSessionService } from '@/services/chat-session.service';
import { WeatherService } from '@/services/weather.service';
import { ChatCreate, ChatUpdate } from '@/types/chat';
import { JWTPayload } from '@/types/auth';

export class ChatController {
  constructor(
    private chatService: ChatService,
    private chatSessionService: ChatSessionService,
    private weatherService: WeatherService
  ) { }

  async createChat(request: FastifyRequest<{ Body: ChatCreate }>, reply: FastifyReply) {
    try {
      let chatSessionId = request.body.chatSessionId;

      // If no chatSessionId is provided, create a new session
      if (!chatSessionId) {
        const newSession = await this.chatSessionService.createSession(request.user!.userId);
        chatSessionId = newSession.id;
      } else {
        // Verify that the session exists and user has access
        const session = await this.chatSessionService.findSessionById(chatSessionId);

        if (!session) {
          return reply.code(404).send({
            error: 'Session not found',
            code: 'SESSION_NOT_FOUND',
            details: { message: 'The chat session does not exist' }
          });
        }

        // Check if user is admin or owner of the session
        if (request.user!.role !== 'ADMIN' && request.user!.userId !== session.userId) {
          return reply.code(403).send({
            error: 'Forbidden',
            code: 'FORBIDDEN',
            details: { message: 'You do not have permission to add messages to this chat session' }
          });
        }
      }

      const chat = await this.chatService.create(request.user!.userId, {
        ...request.body,
        chatSessionId
      });
      return reply.send(chat);
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to create chat message' });
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

  async updateChat(request: FastifyRequest<{ Params: { id: string }, Body: ChatUpdate }>, reply: FastifyReply) {
    try {
      const chat = await this.chatService.updateChat(request.params.id, request.body);

      // Check if user is admin or owner of the session
      if (request.user!.role !== 'ADMIN' && request.user!.userId !== chat.chatSession.userId) {
        return reply.code(403).send({
          error: 'Forbidden',
          code: 'FORBIDDEN',
          details: { message: 'You do not have permission to modify this chat message' }
        });
      }

      return reply.send(chat);
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to update chat message' });
    }
  }

  async deleteChat(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      // Try to update the chat to verify its existence and get session info
      let chat;
      try {
        chat = await this.chatService.updateChat(request.params.id, { message: '', role: 'user', turn: 0 });
      } catch (error) {
        return reply.code(404).send({
          error: 'Chat not found',
          code: 'CHAT_NOT_FOUND',
          details: { message: 'The chat message does not exist' }
        });
      }

      // Check if user is admin or owner of the session
      if (request.user!.role !== 'ADMIN' && request.user!.userId !== chat.chatSession.userId) {
        return reply.code(403).send({
          error: 'Forbidden',
          code: 'FORBIDDEN',
          details: { message: 'You do not have permission to delete this chat message' }
        });
      }

      await this.chatService.deleteChat(request.params.id);
      return reply.code(204).send();
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to delete chat message' });
    }
  }

  async getChatsBySession(request: FastifyRequest<{ Params: { sessionId: string } }>, reply: FastifyReply) {
    try {
      // Verify that the session exists and user has access
      const session = await this.chatSessionService.findSessionById(request.params.sessionId);

      if (!session) {
        return reply.code(404).send({
          error: 'Session not found',
          code: 'SESSION_NOT_FOUND',
          details: { message: 'The chat session does not exist' }
        });
      }

      // Check if user is admin or owner of the session
      if (request.user!.role !== 'ADMIN' && request.user!.userId !== session.userId) {
        return reply.code(403).send({
          error: 'Forbidden',
          code: 'FORBIDDEN',
          details: { message: 'You do not have permission to view messages in this chat session' }
        });
      }

      const chats = await this.chatService.getChatsBySessionId(request.params.sessionId);
      return reply.send(chats);
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to get chat messages' });
    }
  }
}