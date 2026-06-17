import { Router } from 'express';

const router = Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new citizen user
 * @access  Public
 */
router.post('/register', async (_req, res) => {
  res.status(501).json({ success: false, error: { message: 'Not implemented yet — Phase 3' } });
});

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login with email/phone and password
 * @access  Public
 */
router.post('/login', async (_req, res) => {
  res.status(501).json({ success: false, error: { message: 'Not implemented yet — Phase 3' } });
});

/**
 * @route   POST /api/v1/auth/login/otp/request
 * @desc    Request OTP for phone-based login
 * @access  Public
 */
router.post('/login/otp/request', async (_req, res) => {
  res.status(501).json({ success: false, error: { message: 'Not implemented yet — Phase 3' } });
});

/**
 * @route   POST /api/v1/auth/login/otp/verify
 * @desc    Verify OTP and get tokens
 * @access  Public
 */
router.post('/login/otp/verify', async (_req, res) => {
  res.status(501).json({ success: false, error: { message: 'Not implemented yet — Phase 3' } });
});

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public (with refresh token)
 */
router.post('/refresh', async (_req, res) => {
  res.status(501).json({ success: false, error: { message: 'Not implemented yet — Phase 3' } });
});

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout and invalidate refresh token
 * @access  Private
 */
router.post('/logout', async (_req, res) => {
  res.status(501).json({ success: false, error: { message: 'Not implemented yet — Phase 3' } });
});

export default router;
