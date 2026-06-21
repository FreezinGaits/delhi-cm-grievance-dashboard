import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authLimiter, otpLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new citizen user
 * @access  Public
 */
router.post('/register', authLimiter, AuthController.register);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login with email/phone and password
 * @access  Public
 */
router.post('/login', authLimiter, AuthController.login);

/**
 * @route   POST /api/v1/auth/login/otp/request
 * @desc    Request OTP for phone-based login
 * @access  Public
 */
router.post('/login/otp/request', otpLimiter, AuthController.requestOTP);

/**
 * @route   POST /api/v1/auth/login/otp/verify
 * @desc    Verify OTP and get tokens
 * @access  Public
 */
router.post('/login/otp/verify', authLimiter, AuthController.verifyOTP);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public (with valid refresh token)
 */
router.post('/refresh', authLimiter, AuthController.refresh);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout and invalidate refresh token
 * @access  Private
 */
router.post('/logout', authenticate, AuthController.logout);

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change password (authenticated)
 * @access  Private
 */
router.post('/change-password', authenticate, AuthController.changePassword);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, AuthController.getProfile);

export default router;
