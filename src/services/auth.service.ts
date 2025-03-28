import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { RegisterDto, LoginDto, AuthResponse } from '../types/auth';
import { Prisma } from '@prisma/client';
import { FastifyInstance } from 'fastify';

const prisma = new PrismaClient();

export class AuthService {
  constructor(private fastify: FastifyInstance) { }

  async register(data: RegisterDto): Promise<AuthResponse> {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        throw new Error('Email already registered');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          ...data,
          password: hashedPassword,
        },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });

      // Generate token
      const token = this.fastify.jwt.sign({
        userId: user.id,
        email: user.email,
      });

      return {
        token,
        user,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new Error('Email already registered');
        }
      }
      throw error;
    }
  }

  async login(data: LoginDto): Promise<AuthResponse> {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(data.password, user.password);

    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Generate token
    const token = this.fastify.jwt.sign({
      userId: user.id,
      email: user.email,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }
} 