import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User, IUser, UserRole } from '../models/User';
import { AuditLog } from '../models/AuditLog';
import { env } from '../config/env';
import { ApiError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface UserPayload {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}

export class AuthService {
  /**
   * Register a new citizen user
   */
  static async register(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    language?: 'en' | 'hi';
  }): Promise<{ user: IUser; tokens: TokenPair }> {
    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: data.email.toLowerCase() }, { phone: data.phone }],
    });

    if (existingUser) {
      throw ApiError.conflict('User with this email or phone already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 12);

    // Create user
    const user = await User.create({
      name: { first: data.firstName, last: data.lastName },
      email: data.email.toLowerCase(),
      phone: data.phone,
      role: UserRole.CITIZEN,
      passwordHash,
      isActive: true,
      preferences: {
        language: data.language || 'en',
        notificationChannels: ['sms', 'whatsapp'],
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Audit log
    await AuditLog.create({
      action: 'USER_REGISTERED',
      entity: 'User',
      entityId: user._id,
      userId: user._id,
    });

    logger.info(`New user registered: ${user.email} (${user.role})`);

    return { user, tokens };
  }

  /**
   * Login with email/phone and password
   */
  static async login(
    identifier: string,
    password: string,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<{ user: IUser; tokens: TokenPair }> {
    // Find user by email or phone, include passwordHash
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { phone: identifier },
      ],
    }).select('+passwordHash');

    if (!user) {
      throw ApiError.unauthorized('Invalid credentials');
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > new Date()) {
      const minutes = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
      throw ApiError.tooManyRequests(`Account locked. Try again in ${minutes} minutes`);
    }

    if (!user.isActive) {
      throw ApiError.forbidden('Account has been deactivated');
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      // Increment login attempts
      user.loginAttempts = (user.loginAttempts || 0) + 1;

      // Lock account after 5 failed attempts
      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        user.loginAttempts = 0;
        await user.save();

        await AuditLog.create({
          action: 'ACCOUNT_LOCKED',
          entity: 'User',
          entityId: user._id,
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
        });

        throw ApiError.tooManyRequests('Too many failed attempts. Account locked for 15 minutes');
      }

      await user.save();
      throw ApiError.unauthorized('Invalid credentials');
    }

    // Reset login attempts on successful login
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const tokens = await this.generateTokens(user, meta);

    // Audit log
    await AuditLog.create({
      action: 'USER_LOGIN',
      entity: 'User',
      entityId: user._id,
      userId: user._id,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return { user, tokens };
  }

  /**
   * Request OTP for phone-based login
   */
  static async requestOTP(phone: string): Promise<{ message: string }> {
    let user = await User.findOne({ phone });

    if (!user) {
      // Auto-create citizen user for OTP login
      const passwordHash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 12);
      user = await User.create({
        name: { first: 'Citizen', last: phone.slice(-4) },
        email: `citizen.${phone.slice(-10)}@placeholder.com`,
        phone,
        role: UserRole.CITIZEN,
        passwordHash,
        isActive: true,
        isPhoneVerified: true,
        preferences: { language: 'en', notificationChannels: ['sms'] },
      });
    }

    // Check OTP cooldown
    if (user.otp?.expiresAt && user.otp.expiresAt > new Date()) {
      const remaining = Math.ceil((user.otp.expiresAt.getTime() - Date.now()) / 1000);
      if (remaining > (env.OTP_EXPIRY_MINUTES * 60 - 60)) {
        throw ApiError.tooManyRequests('OTP already sent. Please wait before requesting again');
      }
    }

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const hashedOTP = await bcrypt.hash(otp, 8);

    user.otp = {
      code: hashedOTP,
      expiresAt: new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000),
      attempts: 0,
    };
    await user.save();

    // In production, send OTP via SMS/WhatsApp
    // For development, log it
    logger.info(`[DEV] OTP for ${phone}: ${otp}`);

    return { message: `OTP sent to ${phone.slice(0, 4)}****${phone.slice(-2)}` };
  }

  /**
   * Verify OTP and return tokens
   */
  static async verifyOTP(
    phone: string,
    otp: string,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<{ user: IUser; tokens: TokenPair }> {
    const user = await User.findOne({ phone }).select('+otp');

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (!user.otp?.code || !user.otp?.expiresAt) {
      throw ApiError.badRequest('No OTP requested. Please request a new OTP');
    }

    // Check if OTP expired
    if (user.otp.expiresAt < new Date()) {
      throw ApiError.badRequest('OTP has expired. Please request a new one');
    }

    // Check attempts
    if (user.otp.attempts >= env.OTP_MAX_ATTEMPTS) {
      user.otp = undefined;
      await user.save();
      throw ApiError.tooManyRequests('Too many OTP attempts. Please request a new OTP');
    }

    // Verify OTP
    const isValid = await bcrypt.compare(otp, user.otp.code);
    if (!isValid) {
      user.otp.attempts = (user.otp.attempts || 0) + 1;
      await user.save();
      throw ApiError.unauthorized('Invalid OTP');
    }

    // Clear OTP and mark phone as verified
    user.otp = undefined;
    user.isPhoneVerified = true;
    user.lastLogin = new Date();
    await user.save();

    const tokens = await this.generateTokens(user, meta);

    await AuditLog.create({
      action: 'OTP_LOGIN',
      entity: 'User',
      entityId: user._id,
      userId: user._id,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return { user, tokens };
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshAccessToken(
    refreshToken: string,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<TokenPair> {
    // Verify refresh token
    let payload: { id: string };
    try {
      payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { id: string };
    } catch {
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }

    const user = await User.findById(payload.id);
    if (!user || !user.isActive) {
      throw ApiError.unauthorized('User not found or inactive');
    }

    // Check if refresh token exists in user's stored tokens
    const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const tokenIndex = user.refreshTokens.findIndex((rt) => rt.token === hashedToken);

    if (tokenIndex === -1) {
      throw ApiError.unauthorized('Refresh token not recognized');
    }

    // Remove old token
    user.refreshTokens.splice(tokenIndex, 1);
    await user.save();

    // Generate new token pair
    return this.generateTokens(user, meta);
  }

  /**
   * Logout — invalidate refresh token
   */
  static async logout(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

    await User.findByIdAndUpdate(userId, {
      $pull: { refreshTokens: { token: hashedToken } },
    });

    await AuditLog.create({
      action: 'USER_LOGOUT',
      entity: 'User',
      entityId: userId,
      userId,
    });
  }

  /**
   * Change password
   */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await User.findById(userId).select('+passwordHash');
    if (!user) throw ApiError.notFound('User not found');

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) throw ApiError.unauthorized('Current password is incorrect');

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.refreshTokens = []; // Invalidate all sessions
    await user.save();

    await AuditLog.create({
      action: 'PASSWORD_CHANGED',
      entity: 'User',
      entityId: user._id,
      userId: user._id,
    });
  }

  /**
   * Generate JWT access + refresh token pair
   */
  private static async generateTokens(
    user: IUser,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<TokenPair> {
    const userPayload: UserPayload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      name: `${user.name.first} ${user.name.last}`,
    };

    const accessToken = jwt.sign(userPayload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRY,
    });

    const refreshToken = jwt.sign({ id: user._id }, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRY,
    });

    // Store hashed refresh token
    const hashedRefresh = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // Limit to 5 concurrent sessions
    if (user.refreshTokens.length >= 5) {
      user.refreshTokens.shift();
    }

    user.refreshTokens.push({
      token: hashedRefresh,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      userAgent: meta?.userAgent,
      ipAddress: meta?.ipAddress,
    });

    await user.save();

    return { accessToken, refreshToken };
  }

  /**
   * Verify access token and return payload
   */
  static verifyAccessToken(token: string): UserPayload {
    try {
      return jwt.verify(token, env.JWT_ACCESS_SECRET) as UserPayload;
    } catch {
      throw ApiError.unauthorized('Invalid or expired access token');
    }
  }
}
