import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { WeatherController } from '@/controllers/weather.controller';
import { WeatherService } from '@/services/weather.service';
import { ChatService } from '@/services/chat.service';
import { authenticate } from '@/middleware/auth.middleware';
import { WeatherQuery, WeatherQuerySchema } from '@/types/weather';
import { JWTPayload } from '@/types/auth';
import { weatherRateLimitConfig } from '@/config/rate-limit';

const chatService = new ChatService();
const weatherService = new WeatherService();
const weatherController = new WeatherController(weatherService, chatService);

interface LocationQuery {
  location?: string;
  lat?: string;
  lon?: string;
}

interface WeatherQueryRequest {
  location: string;
  query: string;
  language?: string;
}

export default async function weatherRoutes(fastify: FastifyInstance) {
  // Apply weather-specific rate limiting to all weather routes
  fastify.register(async (weatherInstance) => {
    weatherInstance.register(require('@fastify/rate-limit'), weatherRateLimitConfig);

    weatherInstance.route<{
      Querystring: WeatherQuery;
    }>({
      method: 'GET',
      url: '/',
      schema: {
        description: 'Get weather information using natural language query',
        tags: ['weather'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          required: ['query', 'location'],
          properties: {
            query: {
              type: 'string',
              description: 'Natural language query about weather (e.g., "How will it be on Friday afternoon?")'
            },
            location: {
              type: 'string',
              description: 'City name or location string'
            },
            language: {
              type: 'string',
              description: 'Language code for the response (e.g., "pt-br", "en")',
              default: 'en'
            }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              temperature: { type: 'string', description: 'Current temperature' },
              high: { type: 'string', description: 'High temperature for the day' },
              low: { type: 'string', description: 'Low temperature for the day' },
              condition: { type: 'string', description: 'Current weather condition' },
              naturalResponse: { type: 'string', description: 'Natural language response to the query' },
              location: { type: 'string', description: 'Location name' },
              weatherCode: { type: 'number', description: 'Weather condition code from Tomorrow.io' }
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
      handler: async (
        request: FastifyRequest<{ Querystring: WeatherQuery }> & { user: JWTPayload },
        reply: FastifyReply
      ) => {
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
      }
    });

    // Get weather by location (name or coordinates)
    weatherInstance.route<{
      Querystring: LocationQuery;
    }>({
      method: 'GET',
      url: '/location',
      schema: {
        description: 'Get weather information for a specific location',
        tags: ['weather'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          oneOf: [
            {
              required: ['location'],
              properties: {
                location: {
                  type: 'string',
                  description: 'City name or location string (e.g., "Rio de janeiro")'
                }
              }
            },
            {
              required: ['lat', 'lon'],
              properties: {
                lat: {
                  type: 'string',
                  description: 'Latitude coordinate'
                },
                lon: {
                  type: 'string',
                  description: 'Longitude coordinate'
                }
              }
            }
          ]
        },
        response: {
          200: {
            type: 'object',
            properties: {
              temperature: { type: 'string', description: 'Current temperature' },
              high: { type: 'string', description: 'High temperature for the day' },
              low: { type: 'string', description: 'Low temperature for the day' },
              condition: { type: 'string', description: 'Current weather condition' },
              precipitation: { type: 'string', description: 'Precipitation probability and intensity' },
              humidity: { type: 'string', description: 'Current humidity level' },
              windSpeed: { type: 'string', description: 'Current wind speed' },
              location: { type: 'string', description: 'Location name' },
              weatherCode: { type: 'number', description: 'Weather condition code from Tomorrow.io' }
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
      handler: async (
        request: FastifyRequest<{ Querystring: LocationQuery }>,
        reply: FastifyReply
      ) => {
        const { location, lat, lon } = request.query;

        if (!location && (!lat || !lon)) {
          return reply.status(400).send({
            error: 'Either location or coordinates (lat, lon) must be provided',
          });
        }

        try {
          const weatherData = await weatherService.getWeather(
            location || { lat: parseFloat(lat!), lon: parseFloat(lon!) }
          );
          return weatherData;
        } catch (error) {
          return reply.status(500).send({
            error: 'Failed to fetch weather data',
          });
        }
      }
    });

    // Get weather information based on user query
    weatherInstance.route<{
      Querystring: WeatherQueryRequest;
    }>({
      method: 'GET',
      url: '/weather/query',
      schema: {
        description: 'Get weather information based on a natural language query',
        tags: ['weather'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          required: ['location', 'query'],
          properties: {
            location: {
              type: 'string',
              description: 'City name or location string'
            },
            query: {
              type: 'string',
              description: 'Natural language query about weather (e.g., "How will it be on Friday afternoon?")'
            },
            language: {
              type: 'string',
              description: 'Language code for the response (e.g., "pt-br", "en")',
              default: 'en'
            }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              temperature: { type: 'string', description: 'Current temperature' },
              high: { type: 'string', description: 'High temperature for the day' },
              low: { type: 'string', description: 'Low temperature for the day' },
              condition: { type: 'string', description: 'Current weather condition' },
              naturalResponse: { type: 'string', description: 'Natural language response to the query' },
              location: { type: 'string', description: 'Location name' }
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
      handler: async (
        request: FastifyRequest<{ Querystring: WeatherQueryRequest }>,
        reply: FastifyReply
      ) => {
        const { location, query, language = 'en' } = request.query;

        if (!location || !query) {
          return reply.status(400).send({
            error: 'Location and query parameters are required',
          });
        }

        try {
          const weatherData = await weatherService.getWeatherQuery(
            location,
            query,
            language
          );
          return weatherData;
        } catch (error) {
          return reply.status(500).send({
            error: 'Failed to process weather query',
          });
        }
      }
    });
  });
}
