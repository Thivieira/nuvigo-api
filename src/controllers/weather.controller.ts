import { FastifyRequest, FastifyReply } from 'fastify';
import { WeatherService } from '@/services/weather.service';
import { ChatService } from '@/services/chat.service';
import { BaseController } from './base.controller';
import { JWTPayload } from '@/types/auth';
import { WeatherQuery, TimelineRequest } from '@/types/weather';
import { ChatCreate } from '@/types/chat';
import { getWeatherDescription } from '@/utils/weather.utils';
import { AIService } from '@/services/ai.service';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { generateChatTitle } from '@/utils/ai.utils';

export class WeatherController extends BaseController {
  constructor(
    private readonly weatherService: WeatherService,
    private readonly chatService: ChatService,
    private readonly aiService: AIService
  ) {
    super();
  }

  prepareLocation(location: string): string {
    const detectIfLocationIsGeo = location.includes(',');
    if (detectIfLocationIsGeo) {
      const coordinates = location.split(',').map(coord => {
        const num = parseFloat(coord.trim());
        return num.toFixed(4);
      });
      return coordinates.join(', ');
    }

    return location;
  }

  async getFlexibleWeather(
    request: FastifyRequest<{
      Querystring: WeatherQuery;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { location, query, language = 'en' } = request.query;

      // Extract userId from JWT payload
      const userId = request.user?.userId;
      if (!userId) {
        throw new Error('User ID not found in JWT payload');
      }

      const weatherServiceRequest: TimelineRequest = {
        location: this.prepareLocation(location),
        timesteps: ['1h'],
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        fields: [
          'temperature',
          'weatherCode',
          'humidity',
          'windSpeed',
          'windDirection'
        ]
      };

      // Fetch weather data and get context-aware response + session ID
      const result = await this.weatherService.getFlexibleWeather(
        weatherServiceRequest,
        query,
        this.chatService,
        userId
      );

      // Prepare chat data
      const chatData: ChatCreate = {
        chatSessionId: result.sessionId,
        message: query,
        role: 'user',
        turn: 1,
        metadata: {
          location: result.weatherData.location,
          temperature: result.weatherData.temperature,
          condition: result.weatherData.condition,
          high: result.weatherData.high,
          low: result.weatherData.low,
          precipitation: result.weatherData.precipitation,
          humidity: result.weatherData.humidity,
          windSpeed: result.weatherData.windSpeed,
          weatherCode: result.weatherData.weatherCode.toString()
        }
      };

      // Create chat entry
      await this.chatService.create(userId, chatData);

      // create assistant message
      await this.chatService.create(userId, {
        chatSessionId: result.sessionId,
        message: result.weatherData.naturalResponse || '',
        role: 'assistant',
        turn: 2,
        metadata: {
          currentTime: result.weatherData.currentTime
        }
      });

      const messages: ChatCompletionMessageParam[] = [
        {
          role: 'user',
          content: query
        },
        {
          role: 'assistant',
          content: result.weatherData.naturalResponse || ''
        }
      ];

      // Generate title using utility function
      const title = await generateChatTitle(messages);

      // Update session with generated title
      await this.chatService.updateSession(result.sessionId, {
        title
      });

      return this.sendSuccess(reply, result);
    } catch (error) {
      console.log('Error in getFlexibleWeather:', error);
      return this.sendError(reply, this.handleError(error));
    }
  }
} 