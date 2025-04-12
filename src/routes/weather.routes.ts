import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { WeatherController } from '@/controllers/weather.controller';
import { WeatherService } from '@/services/weather.service';
import { ChatService } from '@/services/chat.service';
import { authenticate } from '@/middleware/auth.middleware';
import { WeatherQuery } from '@/types/weather';
import { weatherRateLimitConfig } from '@/config/rate-limit';
import { prisma } from '@/lib/prisma';

const chatService = new ChatService(prisma);
const weatherService = new WeatherService();
const weatherController = new WeatherController(weatherService, chatService);

interface LocationQuery {
  location?: string;
  lat?: string;
  lon?: string;
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
        description: 'Obter informações meteorológicas para uma localização específica',
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
                  description: 'Nome da cidade ou string de localização (ex: "Rio de Janeiro")'
                }
              }
            },
            {
              required: ['lat', 'lon'],
              properties: {
                lat: {
                  type: 'string',
                  description: 'Coordenada de latitude'
                },
                lon: {
                  type: 'string',
                  description: 'Coordenada de longitude'
                }
              }
            }
          ]
        },
        response: {
          200: {
            type: 'object',
            properties: {
              temperature: { type: 'string', description: 'Temperatura atual' },
              high: { type: 'string', description: 'Temperatura máxima do dia' },
              low: { type: 'string', description: 'Temperatura mínima do dia' },
              condition: { type: 'string', description: 'Condição meteorológica atual' },
              precipitation: { type: 'string', description: 'Probabilidade e intensidade de precipitação' },
              humidity: { type: 'string', description: 'Nível atual de umidade' },
              windSpeed: { type: 'string', description: 'Velocidade atual do vento' },
              location: { type: 'string', description: 'Nome da localização' },
              weatherCode: { type: 'number', description: 'Código da condição meteorológica do Tomorrow.io' }
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
  });
}
