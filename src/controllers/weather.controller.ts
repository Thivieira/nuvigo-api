import { FastifyRequest, FastifyReply } from 'fastify';
import { WeatherService } from '@/services/weather.service';
import { ChatService } from '@/services/chat.service';
import { WeatherQuery } from '@/types/weather';
import { CreateChatDto } from '@/types/chat';
import { JWTPayload } from '@/decorators/auth.decorator';

const weatherService = new WeatherService();
const chatService = new ChatService();

export class WeatherController {
  async getWeather(
    request: FastifyRequest<{ Querystring: WeatherQuery }> & { user: JWTPayload },
    reply: FastifyReply
  ) {
    try {
      const weatherData = await weatherService.getWeather(request.query);

      // Save the weather response as a chat entry
      const chatEntry: CreateChatDto = {
        userId: request.user.userId,
        location: weatherData.location,
        temperature: weatherData.temperature,
        condition: JSON.stringify(weatherData.condition),
        naturalResponse: weatherData.naturalResponse,
      };

      const savedChat = await chatService.create(chatEntry);

      return reply.send({
        ...weatherData,
        chatId: savedChat.id,
      });
    } catch (error: any) {
      if (error.status === 404) {
        return reply.status(404).send({ error: error.message });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }
} 