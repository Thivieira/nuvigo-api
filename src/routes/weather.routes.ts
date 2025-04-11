import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { WeatherController } from '@/controllers/weather.controller';
import { WeatherService } from '@/services/weather.service';
import { ChatService } from '@/services/chat.service';
import { authenticate } from '@/middleware/auth.middleware';
import { WeatherQuery, WeatherQuerySchema } from '@/types/weather';
import { JWTPayload } from '@/types/auth';

const chatService = new ChatService();
const weatherService = new WeatherService();
const weatherController = new WeatherController(weatherService, chatService);

export default async function weatherRoutes(fastify: FastifyInstance) {
  fastify.route<{
    Querystring: WeatherQuery;
  }>({
    method: 'GET',
    url: '/',
    schema: {
      description: 'Get weather information using natural language query',
      tags: ['weather'],
      // querystring: {
      //   type: 'object',
      //   required: ['location', 'query'],
      //   properties: {
      //     location: {
      //       type: 'string',
      //       description: 'City name or location string (e.g., "Rio de janeiro" or "-22.9255, -43.1784")'
      //     },
      //     query: {
      //       type: 'string',
      //       description: 'Natural language query about weather (e.g., "How will it be on Friday afternoon?")'
      //     },
      //     language: {
      //       type: 'string',
      //       description: 'Language code for the response (e.g., "pt-br", "en")',
      //       default: 'en'
      //     }
      //   }
      // }
    },
    onRequest: [authenticate],
    handler: async (request: FastifyRequest<{ Querystring: WeatherQuery }> & { user: JWTPayload }, reply: FastifyReply) => {
      console.log('Weather request received:', {
        query: request.query,
        headers: request.headers,
        user: request.user
      });

      try {
        const result = WeatherQuerySchema.safeParse(request.query);
        if (!result.success) {
          const errors = result.error.errors.map(err => ({
            field: err.path[0],
            message: err.message
          }));
          return reply.status(400).send({ errors });
        }
      } catch (error) {
        return reply.status(400).send({
          error: error instanceof Error ? error.message : 'Invalid request'
        });
      }

      try {
        const result = await weatherController.getFlexibleWeather(request, reply);
        console.log('Weather request completed successfully');
        return result;
      } catch (error) {
        console.error('Weather request failed:', error);
        throw error;
      }
    },
  });
}
