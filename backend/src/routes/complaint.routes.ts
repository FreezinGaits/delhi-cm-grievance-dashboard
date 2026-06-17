import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ComplaintController } from '../controllers/complaint.controller';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';
import { authorize, CITIZEN_ACCESS, ALL_STAFF, ALL_ROLES } from '../middleware/rbac.middleware';
import { complaintLimiter } from '../middleware/rateLimit.middleware';
import { UserRole } from '../models/User';

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|mp4|webm|mp3|wav|pdf/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    cb(null, ext && mime);
  },
});

const router = Router();

router.post('/', authenticate, authorize(...CITIZEN_ACCESS), complaintLimiter, upload.array('media', 5), ComplaintController.create);
router.get('/', authenticate, authorize(...ALL_ROLES), ComplaintController.list);
router.get('/track/:referenceNumber', ComplaintController.track);
router.get('/:id', authenticate, authorize(...ALL_ROLES), ComplaintController.getById);
router.patch('/:id/status', authenticate, authorize(...ALL_STAFF), ComplaintController.updateStatus);
router.get('/:id/history', authenticate, authorize(...ALL_ROLES), ComplaintController.getHistory);
router.post('/:id/confirm', authenticate, authorize(...CITIZEN_ACCESS), ComplaintController.confirmResolution);
router.post('/:id/reject', authenticate, authorize(...CITIZEN_ACCESS), ComplaintController.rejectResolution);

export default router;
