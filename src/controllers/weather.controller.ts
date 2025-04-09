import { FastifyReply, FastifyRequest } from 'fastify';
import { WeatherService } from '@/services/weather.service';
import { ChatService } from '@/services/chat.service';
import { BaseController } from './base.controller';
import { WeatherQuery } from '@/types/weather';
import { ErrorResponse } from '@/types/common';
import { JWTPayload } from '@/types/auth';
import { getWeatherDescription } from '@/utils/weather.utils';
import { CreateChatDto } from '@/types/chat';

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
          'dewPoint',
          'freezingRainIntensity',
          'sleetIntensity',
          'snowIntensity',
          'uvHealthConcern',
          'pressureSurfaceLevel'
        ],
        units: 'metric',
        timezone: 'America/Sao_Paulo'
      };

      // Fetch weather data and get context-aware response + session ID
      const { weatherData, sessionId } = await this.weatherService.getFlexibleWeather(
        weatherServiceRequest,
        query,
        this.chatService, // Pass ChatService instance
        userId // Pass userId
      );

      // Prepare chat data
      const chatData: CreateChatDto = {
        chatSessionId: sessionId,
        userId,
        message: query,
        response: weatherData.naturalResponse,
        metadata: {
          location,
          temperature: weatherData.condition.temperature.toString(),
          condition: getWeatherDescription(weatherData.condition.weatherCode),
          naturalResponse: weatherData.naturalResponse,
          weatherData: {
            temperature: weatherData.temperature,
            humidity: weatherData.condition.humidity,
            windSpeed: weatherData.condition.windSpeed,
            windDirection: weatherData.condition.windDirection,
            precipitation: weatherData.condition.precipitationProbability,
            pressure: weatherData.condition.pressureSeaLevel,
            visibility: weatherData.condition.visibility,
            cloudCover: weatherData.condition.cloudCover,
            uvIndex: weatherData.condition.uvIndex,
            dewPoint: weatherData.condition.dewPoint,
            freezingRainIntensity: weatherData.condition.freezingRainIntensity,
            sleetIntensity: weatherData.condition.sleetIntensity,
            snowIntensity: weatherData.condition.snowIntensity,
            uvHealthConcern: weatherData.condition.uvHealthConcern,
            pressureSurfaceLevel: weatherData.condition.pressureSurfaceLevel,
          },
        },
      };

      try {
        // Save the chat message (user query implicitly represented, AI response explicitly saved)
        await this.chatService.create(chatData);
        console.log(`Chat entry saved successfully to session ${sessionId} for user ${userId}`);
      } catch (chatError: any) {
        // Log error but don't fail the main request if chat logging fails
        console.error(`Failed to save chat entry to session ${sessionId}:`, chatError);
      }

      // Return the weather data (including the context-aware naturalResponse)
      return this.sendSuccess(reply, weatherData);

    } catch (error: any) {
      // Keep existing error handling
      if (error instanceof Error && (error.message.includes('Weather data not found') || error.message.includes('Invalid location') || error.message.includes('Invalid temperature data'))) {
        const errorResponse: ErrorResponse = {
          error: 'Location or Weather Data Error',
          code: 'NOT_FOUND',
          details: { message: error.message },
        };
        return this.sendError(reply, errorResponse, 404);
      }

      console.error('Error in getFlexibleWeather Controller:', error);
      return this.sendError(reply, this.handleError(error));
    }
  }
} 