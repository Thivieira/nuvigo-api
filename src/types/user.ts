import { User } from '@prisma/client';

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