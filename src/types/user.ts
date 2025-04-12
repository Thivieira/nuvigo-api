import { User as PrismaUser, UserRole } from '@prisma/client';
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

export const UserBaseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  phone: z.string().nullable(),
  role: z.nativeEnum(UserRole),
  emailVerified: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const UserCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
  phone: z.string().optional()
});

export const UserUpdateSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  name: z.string().optional(),
  phone: z.string().optional()
});

export type UserWithoutPassword = Omit<PrismaUser, 'password'>;
export type User = z.infer<typeof UserBaseSchema>;
export type UserCreate = z.infer<typeof UserCreateSchema>;
export type UserUpdate = z.infer<typeof UserUpdateSchema>;
export type UserResponse = UserWithoutPassword; 