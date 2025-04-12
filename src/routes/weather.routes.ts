import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { WeatherController } from '@/controllers/weather.controller';
import { WeatherService } from '@/services/weather.service';
import { ChatService } from '@/services/chat.service';
import { authenticate } from '@/middleware/auth.middleware';
import { WeatherQuery, WeatherQuerySchema } from '@/types/weather';
import { JWTPayload, AuthenticatedRequest } from '@/types/auth';
import { weatherRateLimitConfig } from '@/config/rate-limit';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const chatService = new ChatService(prisma);
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
    // Register rate limiting
    weatherInstance.register(require('@fastify/rate-limit'), weatherRateLimitConfig);

    // Apply authentication to all weather routes
    weatherInstance.addHook('onRequest', authenticate);

    // Get weather information using natural language query
    weatherInstance.route<{
      Querystring: WeatherQuery;
    }>({
      method: 'GET',
      url: '/',
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
              minLength: 3,
              description: 'City name or location string (e.g., "Rio de janeiro" or "-22.9255, -43.1784")'
            },
            query: {
              type: 'string',
              minLength: 3,
              description: 'Natural language query about weather (e.g., "How will it be on Friday afternoon?")'
            },
            language: {
              type: 'string',
              default: 'en',
              description: 'Language for the response (default: en)'
            }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              weatherData: {
                type: 'object',
                properties: {
                  location: { type: 'string' },
                  temperature: { type: 'string' },
                  condition: { type: 'string' },
                  high: { type: 'string' },
                  low: { type: 'string' },
                  precipitation: { type: 'string' },
                  humidity: { type: 'string' },
                  windSpeed: { type: 'string' },
                  weatherCode: { type: 'number' }
                }
              },
              sessionId: { type: 'string' }
            }
          }
        }
      },
      handler: async (request, reply) => {
        return weatherController.getFlexibleWeather(request, reply);
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
