import { FastifyReply, FastifyRequest } from 'fastify';
import { WeatherService } from '@/services/weather.service';
import { ChatService } from '@/services/chat.service';
import { BaseController } from './base.controller';
import { WeatherQuery, TimelineRequest } from '@/types/weather';
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

      console.log('Weather data:', weatherData);

      // Format condition data for response
      const formattedWeatherData = {
        ...weatherData,
        condition: {
          temperature: weatherData.condition.temperature,
          temperatureApparent: weatherData.condition.temperatureApparent,
          humidity: weatherData.condition.humidity,
          windSpeed: weatherData.condition.windSpeed,
          windDirection: weatherData.condition.windDirection,
          windGust: weatherData.condition.windGust,
          precipitationProbability: weatherData.condition.precipitationProbability,
          rainIntensity: weatherData.condition.rainIntensity,
          snowIntensity: weatherData.condition.snowIntensity,
          sleetIntensity: weatherData.condition.sleetIntensity,
          freezingRainIntensity: weatherData.condition.freezingRainIntensity,
          cloudCover: weatherData.condition.cloudCover,
          visibility: weatherData.condition.visibility,
          pressureSurfaceLevel: weatherData.condition.pressureSurfaceLevel,
          pressureSeaLevel: weatherData.condition.pressureSeaLevel,
          dewPoint: weatherData.condition.dewPoint,
          uvIndex: weatherData.condition.uvIndex,
          uvHealthConcern: weatherData.condition.uvHealthConcern,
          weatherCode: weatherData.condition.weatherCode
        }
      };

      // Save weather response to chat history
      const chatEntry: CreateChatDto = {
        userId: request.user.userId,
        location: weatherData.location,
        temperature: weatherData.temperature,
        condition: JSON.stringify(formattedWeatherData.condition),
        naturalResponse: weatherData.naturalResponse,
      };

      await this.chatService.create(chatEntry);

      return this.sendSuccess(reply, formattedWeatherData);
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

  async getTimelineWeather(request: FastifyRequest<{ Body: TimelineRequest }> & { user: JWTPayload }, reply: FastifyReply) {
    try {
      const weatherData = await this.weatherService.getTimelineWeather(request.body);
      return this.sendSuccess(reply, weatherData);
    } catch (error) {
      if (error instanceof Error && error.message === 'Weather timeline data not found.') {
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

  async getFlexibleWeather(request: FastifyRequest<{ Body: TimelineRequest & { query: string } }> & { user: JWTPayload }, reply: FastifyReply) {
    try {
      const { query, ...timelineRequest } = request.body;
      const weatherData = await this.weatherService.getFlexibleWeather(timelineRequest, query);

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