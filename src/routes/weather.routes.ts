import { FastifyInstance } from 'fastify';
import { WeatherController } from '@/controllers/weather.controller';
import { WeatherService } from '@/services/weather.service';
import { ChatService } from '@/services/chat.service';
import { authenticate } from '@/decorators/auth.decorator';
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import {
  WeatherQuerySchema,
  ChatWeatherResponseSchema,
} from '@/types/weather';
import { ErrorResponseSchema } from '@/types/common';

const weatherService = new WeatherService();
const chatService = new ChatService();
const weatherController = new WeatherController(weatherService, chatService);

export async function weatherRoutes(fastify: FastifyInstance) {
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/',
    schema: {
      description: 'Get weather information for a location',
      tags: ['weather'],
      querystring: WeatherQuerySchema,
      response: {
        200: ChatWeatherResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    onRequest: [authenticate],
    handler: async (request, reply) => {
      return weatherController.getWeather(request as any, reply);
    },
  });
}
