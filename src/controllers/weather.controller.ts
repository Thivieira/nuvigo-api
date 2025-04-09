import { FastifyReply, FastifyRequest } from 'fastify';
import { WeatherService } from '@/services/weather.service';
import { ChatService } from '@/services/chat.service';
import { BaseController } from './base.controller';
import { WeatherQuery } from '@/types/weather';
import { ErrorResponse } from '@/types/common';
import { JWTPayload } from '@/types/auth';
import { getWeatherDescription } from '@/utils/weather.utils';

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
      const userId = request.user.userId; // Extract userId

      // Define the request for the weather service
      const weatherServiceRequest = {
        location: this.prepareLocation(location),
        timesteps: ['1h'],
        startTime: 'now',
        endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
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
          'temperatureApparent',
          'weatherCode',
        ],
        units: 'metric',
        timezone: 'America/Sao_Paulo'
      };

      // Fetch weather data
      const weatherData = await this.weatherService.getFlexibleWeather(weatherServiceRequest, query);

      // Determine the title for the session (e.g., the user's initial query)
      const sessionTitle = `Weather in ${weatherData.location} - ${query.substring(0, 50)}${query.length > 50 ? '...' : ''}`;

      // Find or create an active chat session for the user
      const session = await this.chatService.findOrCreateActiveSession(userId, sessionTitle);

      // Prepare chat data with the session ID
      const chatData = {
        chatSessionId: session.id, // Use the obtained session ID
        location: weatherData.location,
        temperature: weatherData.temperature,
        condition: getWeatherDescription(weatherData.condition.weatherCode),
        naturalResponse: weatherData.naturalResponse,
      };

      try {
        // Save the chat message to the determined session
        await this.chatService.create(chatData);
        console.log(`Chat entry saved successfully to session ${session.id} for user ${userId}`);
      } catch (chatError: any) {
        console.error('Failed to save chat entry:', chatError);
      }

      // Return the original weather data
      return this.sendSuccess(reply, weatherData);

    } catch (error: any) {
      if (error instanceof Error && (error.message.includes('Weather data not found') || error.message.includes('Invalid location'))) {
        const errorResponse: ErrorResponse = {
          error: 'Location not found',
          code: 'NOT_FOUND',
          details: { message: 'The specified location could not be found' },
        };
        return this.sendError(reply, errorResponse, 404);
      }

      console.error('Error in getFlexibleWeather:', error);

      return this.sendError(reply, this.handleError(error));
    }
  }
} 