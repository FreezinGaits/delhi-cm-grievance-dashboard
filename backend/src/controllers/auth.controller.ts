import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AuthService } from '../services/auth.service';
import { ApiError } from '../middleware/error.middleware';

export class AuthController {
  /**
   * POST /auth/register
   */
  static async register(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { firstName, lastName, email, phone, password, language } = req.body;

      if (!firstName || !lastName || !email || !phone || !password) {
        throw ApiError.badRequest('All fields are required: firstName, lastName, email, phone, password');
      }

      // Password validation
      if (password.length < 8) {
        throw ApiError.badRequest('Password must be at least 8 characters');
      }

      const { user, tokens } = await AuthService.register({
        firstName,
        lastName,
        email,
        phone,
        password,
        language,
      });

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user._id,
            name: `${user.name.first} ${user.name.last}`,
            email: user.email,
            phone: user.phone,
            role: user.role,
          },
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/login
   */
  static async login(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { identifier, password } = req.body;

      if (!identifier || !password) {
        throw ApiError.badRequest('Email/phone and password are required');
      }

      const meta = {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
      };

      const { user, tokens } = await AuthService.login(identifier, password, meta);

      res.json({
        success: true,
        data: {
          user: {
            id: user._id,
            name: `${user.name.first} ${user.name.last}`,
            email: user.email,
            phone: user.phone,
            role: user.role,
          },
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/login/otp/request
   */
  static async requestOTP(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { phone } = req.body;

      if (!phone) {
        throw ApiError.badRequest('Phone number is required');
      }

      const result = await AuthService.requestOTP(phone);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/login/otp/verify
   */
  static async verifyOTP(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { phone, otp } = req.body;

      if (!phone || !otp) {
        throw ApiError.badRequest('Phone and OTP are required');
      }

      const meta = {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
      };

      const { user, tokens } = await AuthService.verifyOTP(phone, otp, meta);

      res.json({
        success: true,
        data: {
          user: {
            id: user._id,
            name: `${user.name.first} ${user.name.last}`,
            email: user.email,
            phone: user.phone,
            role: user.role,
          },
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/refresh
   */
  static async refresh(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw ApiError.badRequest('Refresh token is required');
      }

      const meta = {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
      };

      const tokens = await AuthService.refreshAccessToken(refreshToken, meta);

      res.json({
        success: true,
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/logout
   */
  static async logout(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!req.user?.id) {
        throw ApiError.unauthorized('Authentication required');
      }

      if (refreshToken) {
        await AuthService.logout(req.user.id, refreshToken);
      }

      res.json({ success: true, data: { message: 'Logged out successfully' } });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/change-password
   */
  static async changePassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!req.user?.id) {
        throw ApiError.unauthorized('Authentication required');
      }

      if (!currentPassword || !newPassword) {
        throw ApiError.badRequest('Current password and new password are required');
      }

      if (newPassword.length < 8) {
        throw ApiError.badRequest('New password must be at least 8 characters');
      }

      await AuthService.changePassword(req.user.id, currentPassword, newPassword);

      res.json({ success: true, data: { message: 'Password changed successfully' } });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /auth/me — get current user profile
   */
  static async getProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        throw ApiError.unauthorized('Authentication required');
      }

      const { User } = await import('../models/User');
      const user = await User.findById(req.user.id).populate('departmentId', 'name code');

      if (!user) {
        throw ApiError.notFound('User not found');
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user._id,
            name: `${user.name.first} ${user.name.last}`,
            email: user.email,
            phone: user.phone,
            role: user.role,
            department: user.departmentId,
            ward: user.ward,
            isActive: user.isActive,
            lastLogin: user.lastLogin,
            preferences: user.preferences,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
