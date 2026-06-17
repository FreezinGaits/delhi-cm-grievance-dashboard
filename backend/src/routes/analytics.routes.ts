import { Router } from 'express';

const router = Router();

router.get('/overview', async (_req, res) => {
  res.status(501).json({ success: false, error: { message: 'Not implemented yet — Phase 12' } });
});

export default router;
