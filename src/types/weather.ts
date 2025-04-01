import { z } from 'zod';
import { FastifyRequest } from 'fastify';
import { JWTPayload } from '@/types/auth';
import { ErrorResponseSchema, PaginationQuerySchema } from './common';

// API Response Types
export const WeatherConditionSchema = z.object({
  temperature: z.number(),
  humidity: z.number(),
  windSpeed: z.number(),
  windDirection: z.number(),
  precipitation: z.number(),
  pressureSurfaceLevel: z.number(),
  uvIndex: z.number(),
}).describe('Weather conditions for a specific location');

export const LocationSchema = z.object({
  name: z.string(),
  lat: z.number(),
  lon: z.number(),
}).describe('Geographic location information');

export const WeatherDataSchema = z.object({
  time: z.string(),
  weather: WeatherConditionSchema,
  location: LocationSchema,
}).describe('Complete weather data for a location');

// Request Types
export const WeatherQuerySchema = z.object({
  location: z.string().min(1),
  language: z.string().default('en').refine((val) => ['en', 'pt'].includes(val), {
    message: 'Language must be either "en" or "pt"',
  }),
}).describe('Query parameters for weather information');

// Response Types
export const WeatherResponseSchema = z.object({
  location: z.string(),
  temperature: z.string(),
  condition: WeatherConditionSchema,
  naturalResponse: z.string(),
}).describe('Weather response with natural language description');

export const ChatWeatherResponseSchema = WeatherResponseSchema.extend({
  chatId: z.string().uuid(),
}).describe('Weather response with chat ID');

// API Types
export const TomorrowIoConditionSchema = z.object({
  data: z.object({
    time: z.string(),
    values: WeatherConditionSchema,
  }),
  location: LocationSchema,
}).describe('Weather data from Tomorrow.io API');

// TypeScript Types
export type WeatherData = z.infer<typeof WeatherDataSchema>;
export type WeatherQuery = z.infer<typeof WeatherQuerySchema>;
export type WeatherResponse = z.infer<typeof WeatherResponseSchema>;
export type ChatWeatherResponse = z.infer<typeof ChatWeatherResponseSchema>;
export type TomorrowIoCondition = z.infer<typeof TomorrowIoConditionSchema>;

// Route Handler Types
export type WeatherRouteHandler = FastifyRequest<{
  Querystring: WeatherQuery;
}> & { user: JWTPayload };

// Route Schemas
export const WeatherRouteSchemas = {
  getWeather: {
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
} as const; 