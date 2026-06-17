import { Router } from 'express';

const router = Router();

router.get('/dashboard', async (_req, res) => {
  res.status(501).json({ success: false, error: { message: 'Not implemented yet — Phase 8' } });
});

router.get('/heatmap', async (_req, res) => {
  res.status(501).json({ success: false, error: { message: 'Not implemented yet — Phase 8' } });
});

router.get('/nearby-complaints', async (_req, res) => {
  res.status(501).json({ success: false, error: { message: 'Not implemented yet — Phase 9' } });
});

export default router;
