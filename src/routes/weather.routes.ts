import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { WeatherController } from '@/controllers/weather.controller';
import { WeatherService } from '@/services/weather.service';
import { ChatService } from '@/services/chat.service';
import { authenticate } from '@/middleware/auth.middleware';
import { WeatherQuery } from '@/types/weather';
import { JWTPayload } from '@/types/auth';

const chatService = new ChatService();
const weatherService = new WeatherService();
const weatherController = new WeatherController(weatherService, chatService);

export default async function weatherRoutes(fastify: FastifyInstance) {
  fastify.route<{
    Querystring: WeatherQuery;
  }>({
    method: 'GET',
    url: '/weather',
    schema: {
      description: 'Get weather information by location',
      tags: ['weather'],
      querystring: {
        type: 'object',
        required: ['location', 'language'],
        properties: {
          location: { type: 'string' },
          language: { type: 'string', default: 'en' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            location: { type: 'string' },
            temperature: { type: 'string' },
            condition: { type: 'string' },
            naturalResponse: { type: 'string' }
          }
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            code: { type: 'string' },
            details: { type: 'object' }
          }
        },
        401: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            code: { type: 'string' },
            details: { type: 'object' }
          }
        },
        500: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            code: { type: 'string' },
            details: { type: 'object' }
          }
        }
      }
    },
    onRequest: [authenticate],
    handler: async (request: FastifyRequest<{ Querystring: WeatherQuery }> & { user: JWTPayload }, reply: FastifyReply) => {
      return weatherController.getWeather(request, reply);
    },
  });
}
