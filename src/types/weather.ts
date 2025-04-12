import { z } from 'zod';
import { FastifyRequest } from 'fastify';
import { JWTPayload } from '@/types/auth';
import { ErrorResponseSchema, PaginationQuerySchema } from './common';

// API Response Types
export const WeatherConditionSchema = z.object({
  cloudBase: z.number().nullable(),
  cloudCeiling: z.number().nullable(),
  cloudCover: z.number(),
  dewPoint: z.number(),
  freezingRainIntensity: z.number(),
  humidity: z.number(),
  precipitationProbability: z.number(),
  pressureSeaLevel: z.number(),
  pressureSurfaceLevel: z.number(),
  rainIntensity: z.number(),
  sleetIntensity: z.number(),
  snowIntensity: z.number(),
  temperature: z.number(),
  temperatureApparent: z.number(),
  uvHealthConcern: z.number(),
  uvIndex: z.number(),
  visibility: z.number(),
  weatherCode: z.number(),
  windDirection: z.number(),
  windGust: z.number(),
  windSpeed: z.number(),
}).describe('Weather conditions for a specific location');

export const LocationSchema = z.object({
  name: z.string().optional(),
  type: z.literal('Point').optional(),
  coordinates: z.tuple([z.number(), z.number()]).optional(),
}).describe('Location information');

export const WeatherDataSchema = z.object({
  time: z.string(),
  weather: WeatherConditionSchema,
  location: LocationSchema,
}).describe('Complete weather data for a location');

export const WeatherResponseSchema = z.object({
  location: z.string(),
  temperature: z.string(),
  condition: WeatherConditionSchema,
  naturalResponse: z.string(),
  currentTime: z.string(),
}).describe('Weather response with natural language description');

export const TimelineWeatherValuesSchema = z.object({
  cloudBase: z.number().nullable(),
  cloudCeiling: z.number().nullable(),
  cloudCover: z.number(),
  humidity: z.number(),
  precipitationIntensity: z.number(),
  precipitationProbability: z.number(),
  precipitationType: z.number(),
  pressureSeaLevel: z.number(),
  schuurClassification: z.number(),
  temperature: z.number(),
  temperatureApparent: z.number(),
  visibility: z.number(),
  windDirection: z.number(),
  windGust: z.number(),
  windSpeed: z.number(),
}).describe('Weather values for a timeline interval');

export const TimelineIntervalSchema = z.object({
  startTime: z.string(),
  values: TimelineWeatherValuesSchema,
}).describe('Weather data for a specific time interval');

export const TimelineSchema = z.object({
  timestep: z.string(),
  endTime: z.string(),
  startTime: z.string(),
  intervals: z.array(TimelineIntervalSchema),
}).describe('Weather timeline data');

export const TimelineResponseSchema = z.object({
  data: z.object({
    timelines: z.array(TimelineSchema),
  }),
}).describe('Response from Tomorrow.io timelines API');

export const TimelineRequestSchema = z.object({
  location: z.union([
    z.string(),
    z.object({
      type: z.literal('Point').optional(),
      coordinates: z.tuple([z.number(), z.number()]).optional(),
      name: z.string().optional()
    }).strict()
  ]),
  timesteps: z.array(z.string()),
  startTime: z.string(),
  endTime: z.string(),
  fields: z.array(z.string()),
}).describe('Request body for Tomorrow.io timelines API');

export const WeatherQuerySchema = z.object({
  location: z.string().min(3), // it will come like this: "-22.9255, -43.1784" or "belo horizonte"
  query: z.string().min(3),
}).describe('Query parameters for weather endpoint');

// Type exports
export type WeatherCondition = z.infer<typeof WeatherConditionSchema>;
export type Location = z.infer<typeof LocationSchema>;
export type WeatherData = z.infer<typeof WeatherDataSchema>;
export type WeatherResponse = z.infer<typeof WeatherResponseSchema>;
export type TimelineWeatherValues = z.infer<typeof TimelineWeatherValuesSchema>;
export type TimelineInterval = z.infer<typeof TimelineIntervalSchema>;
export type Timeline = z.infer<typeof TimelineSchema>;
export type TimelineResponse = z.infer<typeof TimelineResponseSchema>;
export type TimelineRequest = z.infer<typeof TimelineRequestSchema> & {
  units?: string;
  timezone?: string;
};
export type WeatherQuery = z.infer<typeof WeatherQuerySchema>;

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
      200: WeatherResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
  },
} as const; 