import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '@/services/auth.service';
import { RegisterDto, LoginDto } from '@/types/auth';
import { TokenService } from '@/services/token.service';
import { BaseController } from '@/controllers/base.controller';

export class AuthController extends BaseController {
  constructor(
    private readonly authService: AuthService
  ) {
    super();
  }

  async register(request: FastifyRequest<{ Body: RegisterDto }>, reply: FastifyReply) {
    try {
      const { email, password, name } = request.body;
      const result = await this.authService.register({ email, password, name });
      return this.sendSuccess(reply, result);
    } catch (error) {
      if (error instanceof Error && error.message === 'User already exists') {
        return this.sendError(reply, {
          error: 'User already exists',
          code: 'USER_EXISTS',
          details: { email: request.body.email }
        }, 400);
      }
      return this.sendError(reply, this.handleError(error));
    }
  }

  async login(request: FastifyRequest<{ Body: LoginDto }>, reply: FastifyReply) {
    try {
      const { email, password } = request.body;
      const result = await this.authService.login({ email, password });
      return this.sendSuccess(reply, {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid credentials') {
        return this.sendError(reply, {
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        }, 401);
      }
      return this.sendError(reply, this.handleError(error));
    }
  }

  async refreshToken(request: FastifyRequest<{ Body: { refreshToken: string } }>, reply: FastifyReply) {
    try {
      const { refreshToken } = request.body;
      const result = await this.authService.refreshToken(refreshToken);
      return this.sendSuccess(reply, result);
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid refresh token') {
        return this.sendError(reply, {
          error: 'Invalid refresh token',
          code: 'INVALID_REFRESH_TOKEN'
        }, 401);
      }
      return this.sendError(reply, this.handleError(error));
    }
  }

  async logout(request: FastifyRequest<{ Body: { refreshToken: string } }>, reply: FastifyReply) {
    try {
      const { refreshToken } = request.body;
      await this.authService.logout(refreshToken);
      return this.sendSuccess(reply, { message: 'Successfully logged out' });
    } catch (error) {
      return this.sendError(reply, this.handleError(error));
    }
  }

  async verifyEmail(request: FastifyRequest<{ Params: { token: string } }>, reply: FastifyReply) {
    try {
      const { token } = request.params;
      await this.authService.verifyEmail(token);
      return this.sendSuccess(reply, { message: 'Email verified successfully' });
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid verification token') {
        return this.sendError(reply, {
          error: 'Invalid verification token',
          code: 'INVALID_VERIFICATION_TOKEN'
        }, 400);
      }
      return this.sendError(reply, this.handleError(error));
    }
  }

  async forgotPassword(request: FastifyRequest<{ Body: { email: string } }>, reply: FastifyReply) {
    try {
      const { email } = request.body;
      await this.authService.forgotPassword(email);
      return this.sendSuccess(reply, {
        message: 'If an account exists with this email, you will receive a password reset link'
      });
    } catch (error) {
      return this.sendError(reply, this.handleError(error));
    }
  }

  async resetPassword(
    request: FastifyRequest<{
      Params: { token: string },
      Body: { password: string }
    }>,
    reply: FastifyReply
  ) {
    try {
      const { token } = request.params;
      const { password } = request.body;
      await this.authService.resetPassword(token, password);
      return this.sendSuccess(reply, { message: 'Password reset successfully' });
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid reset token') {
        return this.sendError(reply, {
          error: 'Invalid reset token',
          code: 'INVALID_RESET_TOKEN'
        }, 400);
      }
      return this.sendError(reply, this.handleError(error));
    }
  }

  async me(request: FastifyRequest & { user: { userId: string } }, reply: FastifyReply) {
    try {
      console.log('me', request.user);
      const user = await this.authService.getCurrentUser(request.user.userId);
      if (!user) {
        return this.sendError(reply, {
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        }, 404);
      }
      return this.sendSuccess(reply, user);
    } catch (error) {
      return this.sendError(reply, this.handleError(error));
    }
  }
} 