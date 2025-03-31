import { FastifyInstance } from 'fastify';
import { WeatherController } from '@/controllers/weather.controller';
import { WeatherQuery } from '@/types/weather';
import { authenticate } from '@/decorators/auth.decorator';

const weatherController = new WeatherController();

export async function weatherRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: WeatherQuery }>(
    '/',
    {
      onRequest: [authenticate],
      schema: {
        querystring: {
          type: 'object',
          required: ['location'],
          properties: {
            location: { type: 'string' },
            language: { type: 'string', default: 'en' },
          },
        },
      },
    },
    weatherController.getWeather.bind(weatherController)
  );
}
