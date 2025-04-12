import { FastifyRequest, FastifyReply } from 'fastify';
import { ChatService } from '@/services/chat.service';
import { WeatherService } from '@/services/weather.service';
import { ChatCreate, ChatUpdate } from '@/types/chat';
import { getWeatherDescription } from '@/utils/weather.utils';
import { analyzeLocation } from '@/utils/location.utils';
import { JWTPayload, AuthenticatedRequest } from '@/types/auth';
import { WeatherResponse } from '@/types/weather';

interface RequestWithUser extends FastifyRequest {
  user: JWTPayload;
  body: ChatCreate;
}

export class ChatController {
  constructor(
    private chatService: ChatService,
    private weatherService: WeatherService
  ) { }

  async createChat(request: RequestWithUser, reply: FastifyReply) {
    try {
      // Create the user's message
      const userChat = await this.chatService.createChat({
        chatSessionId: request.body.chatSessionId,
        message: request.body.message,
        role: request.body.role,
        turn: request.body.turn,
        metadata: request.body.metadata
      });

      // If the message is from a user, process it as a weather query
      if (request.body.role === 'user') {
        // Analyze the location from the context
        const locationAnalysis = await analyzeLocation(
          request.body.message,
          request.user.userId
        );

        // Get weather information
        const weatherResult = await this.weatherService.getFlexibleWeather(
          {
            location: locationAnalysis.location,
            fields: ['temperature', 'condition', 'high', 'low', 'precipitation', 'humidity', 'windSpeed', 'weatherCode'],
            timesteps: ['current', '1h'],
            startTime: 'now',
            endTime: 'now'
          },
          request.body.message,
          this.chatService,
          request.user.userId
        );

        // Generate natural language response
        const weatherDescription = getWeatherDescription(weatherResult.weatherData.weatherCode);

        // Create assistant's response
        const assistantChat = await this.chatService.createChat({
          chatSessionId: request.body.chatSessionId,
          message: weatherDescription,
          role: 'assistant',
          turn: request.body.turn + 1,
          metadata: {
            weather: weatherResult.weatherData,
            source: 'weather_api',
            location: {
              name: locationAnalysis.location,
              confidence: locationAnalysis.confidence,
              source: locationAnalysis.source
            }
          }
        });

        // Get the full chat history for this session
        const chatHistory = await this.chatService.getChatsBySessionId(request.body.chatSessionId);

        return reply.code(201).send({
          userMessage: userChat,
          assistantMessage: assistantChat,
          chatHistory
        });
      }

      // For non-user messages, just return the created message
      return reply.code(201).send(userChat);
    } catch (error) {
      return reply.code(500).send({
        error: 'Failed to create chat',
        code: 'CHAT_CREATION_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
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
      console.log('chats', chats);
      return reply.send(chats);
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to get chats' });
    }
  }

  async getSession(request: FastifyRequest<{ Params: { sessionId: string } }>, reply: FastifyReply) {
    try {
      // Since this route is protected by the authenticate middleware,
      // we can safely use non-null assertion for the user property
      const user = request.user!;

      const session = await this.chatService.getSessionById(request.params.sessionId);

      if (!session) {
        return reply.code(404).send({
          error: 'Session not found',
          code: 'SESSION_NOT_FOUND',
          details: { message: 'The requested chat session does not exist' }
        });
      }

      // Check if user is admin or owner of the session
      if (user.role !== 'ADMIN' && user.userId !== session.userId) {
        return reply.code(403).send({
          error: 'Forbidden',
          code: 'FORBIDDEN',
          details: { message: 'You do not have permission to access this chat session' }
        });
      }

      return reply.send(session);
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to get session' });
    }
  }

  async getSessions(request: FastifyRequest, reply: FastifyReply) {
    try {
      const sessions = await this.chatService.getSessionsByUserId(request.user.userId);
      return reply.send(sessions);
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to get sessions' });
    }
  }
}