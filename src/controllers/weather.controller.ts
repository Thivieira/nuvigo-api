import { FastifyRequest, FastifyReply } from 'fastify';
import { WeatherService } from '@/services/weather.service';
import { ChatService } from '@/services/chat.service';
import { BaseController } from './base.controller';
import { WeatherQuery, TimelineRequest } from '@/types/weather';
import { ChatCreate } from '@/types/chat';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { generateChatTitle } from '@/utils/ai.utils';
import dayjs from '@/lib/dayjs';

export class WeatherController extends BaseController {
  constructor(
    private readonly weatherService: WeatherService,
    private readonly chatService: ChatService,
  ) {
    super();
  }

  prepareLocation(location?: string): string | { type: 'Point'; coordinates: [number, number] } {
    if (!location) {
      return '';
    }

    if (location.includes(',')) {
      const [lat, lon] = location.split(',').map(coord => parseFloat(coord.trim()));
      if (isNaN(lat) || isNaN(lon)) {
        throw new Error('Invalid coordinates format');
      }
      const point: { type: 'Point'; coordinates: [number, number] } = {
        type: 'Point',
        coordinates: [lon, lat]
      };
      return point;
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
      const { location, query } = request.query;

      // Extract userId from JWT payload
      const userId = request.user?.userId;
      if (!userId) {
        throw new Error('User ID not found in JWT payload');
      }

      const now = dayjs();
      const preparedLocation = location ? this.prepareLocation(location) : undefined;
      const weatherServiceRequest: TimelineRequest = {
        location: preparedLocation,
        startTime: now.toISOString(),
        endTime: now.add(24, 'hour').toISOString(),
        timesteps: ['1h'] as const,
        fields: [
          'temperature',
          'humidity',
          'windSpeed',
          'windDirection'
        ] as const
      } as TimelineRequest;

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

      return this.sendSuccess(reply, {
        weatherData: result.weatherData,
        sessionId: result.sessionId,
        naturalResponse: result.naturalResponse
      });
    } catch (error) {
      console.error('Error in getFlexibleWeather:', error);
      return this.sendError(reply, this.handleError(error));
    }
  }
} 