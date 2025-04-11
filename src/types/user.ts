import { User } from '@prisma/client';
import { z } from 'zod';

export interface CreateUserDto {
  email: string;
  password: string;
  name?: string;
  phone?: string;
}

export interface UpdateUserDto {
  email?: string;
  password?: string;
  name?: string;
  phone?: string;
}

export interface UserResponse {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  role: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type UserWithoutPassword = Omit<User, 'password'>;

export const UserBaseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  createdAt: z.date(),
  updatedAt: z.date()
}).describe('Base user schema');

export const UserCreateSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  password: z.string().min(8)
}).describe('User creation schema');

export const UserUpdateSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().optional(),
  password: z.string().min(8).optional()
}).describe('User update schema');

export type User = z.infer<typeof UserBaseSchema>;
export type UserCreate = z.infer<typeof UserCreateSchema>;
export type UserUpdate = z.infer<typeof UserUpdateSchema>;

export interface UserResponse extends User {
  // Add any additional response-specific fields here
} 