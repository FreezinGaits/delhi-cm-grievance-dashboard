import { Router } from 'express';

const router = Router();

router.get('/users', async (_req, res) => {
  res.status(501).json({ success: false, error: { message: 'Not implemented yet' } });
});

export default router;
