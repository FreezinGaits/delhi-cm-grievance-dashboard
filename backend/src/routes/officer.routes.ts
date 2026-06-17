import { Router } from 'express';

const router = Router();

router.get('/dashboard', async (_req, res) => {
  res.status(501).json({ success: false, error: { message: 'Not implemented yet — Phase 7' } });
});

export default router;
