import { z } from 'zod';

export const ErrorResponseSchema = z.object({
  error: z.string().describe('Error message'),
  code: z.string().optional().describe('Error code'),
  details: z.record(z.unknown()).optional().describe('Additional error details'),
}).describe('Error response schema');

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

export const PaginationQuerySchema = z.object({
  page: z.number().int().positive().default(1).describe('Page number'),
  limit: z.number().int().positive().max(100).default(10).describe('Number of items per page'),
}).describe('Pagination query parameters');

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export const PaginatedResponseSchema = <T extends z.ZodType>(schema: T) =>
  z.object({
    data: z.array(schema).describe('Array of items'),
    meta: z.object({
      total: z.number().describe('Total number of items'),
      page: z.number().describe('Current page number'),
      limit: z.number().describe('Number of items per page'),
      totalPages: z.number().describe('Total number of pages'),
    }).describe('Pagination metadata'),
  }).describe('Paginated response schema');

export type PaginatedResponse<T> = {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}; 