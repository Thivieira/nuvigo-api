import { z } from 'zod';
import { UserRole } from '@prisma/generated/client';
import { FastifyRequest, RouteGenericInterface } from 'fastify';

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface AuthenticatedRequest<T extends RouteGenericInterface = RouteGenericInterface> extends FastifyRequest<T> {
  user: JWTPayload;
}

export const RegisterSchema = z.object({
  email: z.string().email().describe('User email address'),
  password: z.string().min(6).describe('User password (minimum 6 characters)'),
  name: z.string().optional().describe('User full name'),
}).describe('User registration data');

export const LoginSchema = z.object({
  email: z.string().email().describe('User email address'),
  password: z.string().describe('User password'),
}).describe('User login credentials');

export const UserSchema = z.object({
  id: z.string().describe('User unique identifier'),
  email: z.string().email().describe('User email address'),
  name: z.string().nullable().describe('User full name'),
  role: z.nativeEnum(UserRole).describe('User role'),
  emailVerified: z.boolean().optional().describe('Email verification status'),
}).describe('User information');

export const AuthResponseSchema = z.object({
  accessToken: z.string().describe('JWT access token'),
  refreshToken: z.string().describe('JWT refresh token'),
  user: UserSchema,
}).describe('Authentication response');

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().describe('JWT refresh token'),
}).describe('Refresh token data');

export const ForgotPasswordSchema = z.object({
  email: z.string().email().describe('User email address'),
}).describe('Forgot password request data');

export const ResetPasswordSchema = z.object({
  token: z.string().describe('Password reset token'),
  password: z.string().min(6).describe('New password (minimum 6 characters)'),
}).describe('Password reset data');

export const VerifyEmailSchema = z.object({
  token: z.string().describe('Email verification token'),
}).describe('Email verification data');

export const SuccessResponseSchema = z.object({
  success: z.boolean().describe('Operation success status'),
}).describe('Success response');

export type RegisterDto = z.infer<typeof RegisterSchema>;
export type LoginDto = z.infer<typeof LoginSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type RefreshTokenDto = z.infer<typeof RefreshTokenSchema>;
export type ForgotPasswordDto = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>;
export type VerifyEmailDto = z.infer<typeof VerifyEmailSchema>;
export type SuccessResponse = z.infer<typeof SuccessResponseSchema>; 