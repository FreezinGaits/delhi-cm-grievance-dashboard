import { Router } from 'express';

const router = Router();

router.get('/', async (_req, res) => {
  res.status(501).json({ success: false, error: { message: 'Not implemented yet — Phase 4' } });
});

router.post('/', async (_req, res) => {
  res.status(501).json({ success: false, error: { message: 'Not implemented yet — Phase 4' } });
});

router.get('/:id', async (_req, res) => {
  res.status(501).json({ success: false, error: { message: 'Not implemented yet — Phase 4' } });
});

export default router;
