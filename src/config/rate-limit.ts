import { FastifyRequest } from 'fastify';
import { JWTPayload } from '@/types/auth';

type RequestWithUser = FastifyRequest & { user?: JWTPayload };

export const rateLimitConfig = {
  max: 100, // maximum number of requests
  timeWindow: '1 minute', // time window for rate limiting
  ban: 10, // number of requests that can exceed the limit before being banned
  cache: 10000, // number of requests to cache
  // allowList: ['127.0.0.1'], // IPs to exclude from rate limiting
  keyGenerator: (request: FastifyRequest) => {
    // Use user ID if authenticated, otherwise use IP
    const req = request as RequestWithUser;
    return req.user?.userId || request.ip;
  },
  errorResponseBuilder: (request: FastifyRequest, context: { after: string }) => {
    return {
      code: 'RATE_LIMIT_EXCEEDED',
      error: 'Rate limit exceeded',
      message: `Rate limit exceeded, retry in ${context.after}`,
      retryAfter: context.after
    };
  }
};

export const weatherRateLimitConfig = {
  max: 10, // More restrictive limit for weather endpoint
  timeWindow: '1 minute',
  ban: 5,
  cache: 1000,
  keyGenerator: (request: FastifyRequest) => {
    // Use location as part of the key to prevent abuse of different locations
    const req = request as RequestWithUser;
    const location = (request.query as any)?.location || 'default';
    return `${req.user?.userId || request.ip}:${location}`;
  },
  errorResponseBuilder: (request: FastifyRequest, context: { after: string }) => {
    return {
      code: 'WEATHER_RATE_LIMIT_EXCEEDED',
      error: 'Weather API rate limit exceeded',
      message: `Too many weather requests for this location. Please try again in ${context.after}`,
      retryAfter: context.after
    };
  }
}; 