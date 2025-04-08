import { FastifyReply, FastifyRequest } from 'fastify';
import { WeatherService } from '@/services/weather.service';
import { ChatService } from '@/services/chat.service';
import { BaseController } from './base.controller';
import { WeatherQuery } from '@/types/weather';
import { ErrorResponse } from '@/types/common';
import { JWTPayload } from '@/types/auth';

export class WeatherController extends BaseController {
  constructor(
    private readonly weatherService: WeatherService,
    private readonly chatService: ChatService
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
    }> & { user: JWTPayload },
    reply: FastifyReply
  ) {
    try {
      const { location, query, language } = request.query;

      // Create a timeline request with default values
      const timelineRequest = {
        location: this.prepareLocation(location),
        timesteps: ['1h'],
        startTime: 'now',
        endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
        fields: [
          'temperature',
          'humidity',
          'windSpeed',
          'cloudCover',
          'precipitationProbability',
          'uvIndex',
          'visibility',
          'pressureSeaLevel',
          'precipitationIntensity',
          'precipitationType',
          'cloudBase',
          'cloudCeiling',
          'windDirection',
          'windGust',
          'temperatureApparent'
        ]
      };

      const weatherData = await this.weatherService.getFlexibleWeather(timelineRequest, query);
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

      console.error(error);

      return this.sendError(reply, this.handleError(error));
    }
  }
} 