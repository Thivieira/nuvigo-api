import { FastifyReply, FastifyRequest } from 'fastify';
import { WeatherService } from '@/services/weather.service';
import { ChatService } from '@/services/chat.service';
import { BaseController } from './base.controller';
import { WeatherQuery } from '@/types/weather';
import { CreateChatDto } from '@/types/chat';
import { ErrorResponse } from '@/types/common';
import { JWTPayload } from '@/types/auth';

export class WeatherController extends BaseController {
  constructor(
    private readonly weatherService: WeatherService,
    private readonly chatService: ChatService
  ) {
    super();
  }

  async getWeather(request: FastifyRequest<{ Querystring: WeatherQuery }> & { user: JWTPayload }, reply: FastifyReply) {
    try {
      const weatherData = await this.weatherService.getWeather(request.query);

      // Save weather response to chat history
      const chatEntry: CreateChatDto = {
        userId: request.user.userId,
        location: weatherData.location,
        temperature: weatherData.temperature,
        condition: JSON.stringify(weatherData.condition),
        naturalResponse: weatherData.naturalResponse,
      };

      await this.chatService.create(chatEntry);

      return this.sendSuccess(reply, weatherData);
    } catch (error) {
      if (error instanceof Error && error.message === 'Weather data not found.') {
        const errorResponse: ErrorResponse = {
          error: 'Location not found',
          code: 'NOT_FOUND',
          details: { message: 'The specified location could not be found' },
        };
        return this.sendError(reply, errorResponse, 404);
      }

      return this.sendError(reply, this.handleError(error));
    }
  }
} 