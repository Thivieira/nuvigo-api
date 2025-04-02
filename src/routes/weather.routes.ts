import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { WeatherController } from '@/controllers/weather.controller';
import { WeatherService } from '@/services/weather.service';
import { ChatService } from '@/services/chat.service';
import { authenticate } from '@/middleware/auth.middleware';
import { WeatherQuery, TimelineRequest } from '@/types/weather';
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

  fastify.route<{
    Body: TimelineRequest;
  }>({
    method: 'POST',
    url: '/timeline',
    schema: {
      description: 'Get weather timeline information for a location',
      tags: ['weather'],
      body: {
        type: 'object',
        required: ['location', 'timesteps', 'startTime', 'endTime', 'fields'],
        properties: {
          location: {
            anyOf: [
              {
                type: 'string',
                description: 'City name or location string'
              },
              {
                type: 'object',
                required: ['type', 'coordinates'],
                properties: {
                  type: { type: 'string', enum: ['Point'] },
                  coordinates: {
                    type: 'array',
                    items: { type: 'number' },
                    minItems: 2,
                    maxItems: 2
                  }
                }
              }
            ]
          },
          timesteps: {
            type: 'array',
            items: { type: 'string' }
          },
          startTime: { type: 'string' },
          endTime: { type: 'string' },
          fields: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            location: { type: 'string' },
            temperature: { type: 'string' },
            condition: {
              type: 'object',
              properties: {
                cloudBase: { type: 'number', nullable: true },
                cloudCeiling: { type: 'number', nullable: true },
                cloudCover: { type: 'number' },
                dewPoint: { type: 'number' },
                freezingRainIntensity: { type: 'number' },
                humidity: { type: 'number' },
                precipitationProbability: { type: 'number' },
                pressureSeaLevel: { type: 'number' },
                pressureSurfaceLevel: { type: 'number' },
                rainIntensity: { type: 'number' },
                sleetIntensity: { type: 'number' },
                snowIntensity: { type: 'number' },
                temperature: { type: 'number' },
                temperatureApparent: { type: 'number' },
                uvHealthConcern: { type: 'number' },
                uvIndex: { type: 'number' },
                visibility: { type: 'number' },
                weatherCode: { type: 'number' },
                windDirection: { type: 'number' },
                windGust: { type: 'number' },
                windSpeed: { type: 'number' }
              }
            },
            naturalResponse: { type: 'string' },
            currentTime: { type: 'string' },
            queryTime: { type: 'string' },
            targetTime: { type: 'string' }
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
    handler: async (request: FastifyRequest<{ Body: TimelineRequest }> & { user: JWTPayload }, reply: FastifyReply) => {
      return weatherController.getTimelineWeather(request, reply);
    },
  });

  fastify.route<{
    Body: TimelineRequest & { query: string };
  }>({
    method: 'POST',
    url: '/flexible',
    schema: {
      description: 'Get weather information for a location using natural language query',
      tags: ['weather'],
      body: {
        type: 'object',
        required: ['location', 'timesteps', 'startTime', 'endTime', 'fields', 'query'],
        properties: {
          location: {
            anyOf: [
              {
                type: 'string',
                description: 'City name or location string'
              },
              {
                type: 'object',
                required: ['type', 'coordinates'],
                properties: {
                  type: { type: 'string', enum: ['Point'] },
                  coordinates: {
                    type: 'array',
                    items: { type: 'number' },
                    minItems: 2,
                    maxItems: 2
                  }
                }
              }
            ]
          },
          timesteps: {
            type: 'array',
            items: { type: 'string' }
          },
          startTime: { type: 'string' },
          endTime: { type: 'string' },
          fields: {
            type: 'array',
            items: { type: 'string' }
          },
          query: {
            type: 'string',
            description: 'Natural language query for weather (e.g., "How will it be on Friday afternoon?")'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            location: { type: 'string' },
            temperature: { type: 'string' },
            condition: {
              type: 'object',
              properties: {
                cloudBase: { type: 'number', nullable: true },
                cloudCeiling: { type: 'number', nullable: true },
                cloudCover: { type: 'number' },
                dewPoint: { type: 'number' },
                freezingRainIntensity: { type: 'number' },
                humidity: { type: 'number' },
                precipitationProbability: { type: 'number' },
                pressureSeaLevel: { type: 'number' },
                pressureSurfaceLevel: { type: 'number' },
                rainIntensity: { type: 'number' },
                sleetIntensity: { type: 'number' },
                snowIntensity: { type: 'number' },
                temperature: { type: 'number' },
                temperatureApparent: { type: 'number' },
                uvHealthConcern: { type: 'number' },
                uvIndex: { type: 'number' },
                visibility: { type: 'number' },
                weatherCode: { type: 'number' },
                windDirection: { type: 'number' },
                windGust: { type: 'number' },
                windSpeed: { type: 'number' }
              }
            },
            naturalResponse: { type: 'string' },
            currentTime: { type: 'string' },
            queryTime: { type: 'string' },
            targetTime: { type: 'string' }
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
    handler: async (request: FastifyRequest<{ Body: TimelineRequest & { query: string } }> & { user: JWTPayload }, reply: FastifyReply) => {
      return weatherController.getFlexibleWeather(request, reply);
    },
  });
}
