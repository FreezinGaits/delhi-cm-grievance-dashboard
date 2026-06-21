import { Router, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { authorize, OFFICER_ACCESS, ALL_STAFF } from '../middleware/rbac.middleware';
import { Complaint, ComplaintStatus } from '../models/Complaint';
import { ComplaintHistory, HistoryAction } from '../models/ComplaintHistory';
import { ApiError } from '../middleware/error.middleware';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

// Configure Multer storage for resolution evidence
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `evidence-${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    cb(null, ext && mime);
  },
});

const router = Router();

/**
 * GET /officers/dashboard — Kanban board data
 */
router.get('/dashboard', authenticate, authorize(...ALL_STAFF), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) throw ApiError.unauthorized();

    const filter: Record<string, unknown> = { isDeleted: false };

    // Officers see their own; dept heads see department; admin/cm see all
    if (req.user.role === 'officer') {
      filter.assignedOfficer = req.user.id;
    } else if (req.user.role === 'department_head') {
      const { User } = await import('../models/User');
      const user = await User.findById(req.user.id);
      if (user?.departmentId) filter.assignedDepartment = user.departmentId;
    }

    const complaints = await Complaint.find(filter)
      .populate('citizenId', 'name phone')
      .populate('assignedDepartment', 'name code')
      .populate('assignedOfficer', 'name')
      .sort({ priority: -1, createdAt: -1 })
      .lean();

    // Group by status for Kanban columns
    const columns: Record<string, typeof complaints> = {
      submitted: [], assigned: [], in_progress: [],
      provisionally_resolved: [], resolved: [], rejected: [], escalated: [],
    };
    for (const c of complaints) {
      if (columns[c.status]) columns[c.status].push(c);
      else columns[c.status] = [c];
    }

    // Metrics
    const total = complaints.length;
    const resolved = complaints.filter((c) => ['resolved', 'closed'].includes(c.status)).length;
    const breached = complaints.filter((c) => c.sla?.breached).length;

    res.json({
      success: true,
      data: {
        columns,
        metrics: {
          totalAssigned: total,
          resolvedCount: resolved,
          slaBreaches: breached,
          pendingCount: total - resolved,
        },
      },
    });
  } catch (error) { next(error); }
});

/**
 * PATCH /officers/complaints/:id/accept — accept assignment
 */
router.patch('/complaints/:id/accept', authenticate, authorize(...OFFICER_ACCESS), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) throw ApiError.unauthorized();
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) throw ApiError.notFound('Complaint not found');

    const oldStatus = complaint.status;
    complaint.status = ComplaintStatus.IN_PROGRESS;
    complaint.assignedOfficer = req.user.id as any;
    await complaint.save();

    await ComplaintHistory.create({
      complaintId: complaint._id,
      action: HistoryAction.STATUS_CHANGED,
      fromStatus: oldStatus,
      toStatus: ComplaintStatus.IN_PROGRESS,
      performedBy: req.user.id,
      notes: 'Officer accepted and started work',
    });

    res.json({ success: true, data: { complaint } });
  } catch (error) { next(error); }
});

router.post('/complaints/:id/evidence', authenticate, authorize(...OFFICER_ACCESS), upload.single('evidenceImage'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) throw ApiError.unauthorized();
    const { description } = req.body;
    let gpsLat = req.body.gpsLat ? parseFloat(req.body.gpsLat) : undefined;
    let gpsLng = req.body.gpsLng ? parseFloat(req.body.gpsLng) : undefined;

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) throw ApiError.notFound('Complaint not found');

    // EXIF Metadata Extraction if file is uploaded
    let uploadedMediaUrl = '';
    if (!req.file) {
      throw ApiError.badRequest('Resolution evidence photo is required.');
    }

    uploadedMediaUrl = `/uploads/${req.file.filename}`;
    
    try {
      const fileBuffer = fs.readFileSync(req.file.path);
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const parser = require('exif-parser').create(fileBuffer);
      const result = parser.parse();
      
      if (result.tags && result.tags.GPSLatitude && result.tags.GPSLongitude) {
        gpsLat = result.tags.GPSLatitude;
        gpsLng = result.tags.GPSLongitude;
        logger.info(`Extracted GPS coordinates from image EXIF: Lat ${gpsLat}, Lng ${gpsLng}`);
      } else {
        try { fs.unlinkSync(req.file.path); } catch (err) {}
        throw ApiError.badRequest('The uploaded photo does not contain embedded GPS location tags (EXIF data). Please upload a photo captured with location/GPS services enabled on-site.');
      }
    } catch (exifError: any) {
      if (exifError.status === 400) throw exifError;
      logger.warn('Failed to parse EXIF metadata from uploaded image:', exifError);
      try { fs.unlinkSync(req.file.path); } catch (err) {}
      throw ApiError.badRequest('Failed to read image location metadata (EXIF). Please upload a valid photo (JPEG/PNG) containing GPS location tags.');
    }

    // GPS validation — must be within 50m of complaint location
    if (!gpsLat || !gpsLng) {
      try { fs.unlinkSync(req.file.path); } catch (err) {}
      throw ApiError.badRequest('No GPS location data could be retrieved from the uploaded photo.');
    }

    const complaintLat = complaint.location.coordinates[1];
    const complaintLng = complaint.location.coordinates[0];
    const distance = getDistanceMeters(gpsLat, gpsLng, complaintLat, complaintLng);

    if (distance > 50) {
      try { fs.unlinkSync(req.file.path); } catch (err) {}
      throw ApiError.badRequest(
        `Photo GPS is ${Math.round(distance)}m from complaint location. Resolution photo must be captured on-site (within 50m) to confirm compliance.`,
      );
    }

    complaint.status = ComplaintStatus.PROVISIONALLY_RESOLVED;
    complaint.resolutionEvidence = {
      description: description || '',
      media: uploadedMediaUrl ? [{
        url: uploadedMediaUrl,
        metadata: (gpsLat && gpsLng) ? {
          gpsLat,
          gpsLng,
          timestamp: new Date(),
        } : undefined,
      }] : [],
      resolvedAt: new Date(),
      resolvedBy: req.user.id as any,
    };
    await complaint.save();

    await ComplaintHistory.create({
      complaintId: complaint._id,
      action: HistoryAction.EVIDENCE_ADDED,
      fromStatus: ComplaintStatus.IN_PROGRESS,
      toStatus: ComplaintStatus.PROVISIONALLY_RESOLVED,
      performedBy: req.user.id,
      notes: description || 'Resolution evidence submitted',
    });

    res.json({
      success: true,
      data: { message: 'Evidence submitted. Complaint marked as Provisionally Resolved. Awaiting citizen confirmation.' },
    });
  } catch (error) {
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch (err) {}
    }
    next(error);
  }
});

/**
 * POST /officers/complaints/:id/notes — add internal notes
 */
router.post('/complaints/:id/notes', authenticate, authorize(...ALL_STAFF), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) throw ApiError.unauthorized();
    const { note } = req.body;
    if (!note) throw ApiError.badRequest('Note is required');

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) throw ApiError.notFound('Complaint not found');

    complaint.internalNotes.push({ note, addedBy: req.user.id as any, addedAt: new Date() });
    await complaint.save();

    await ComplaintHistory.create({
      complaintId: complaint._id,
      action: HistoryAction.NOTE_ADDED,
      performedBy: req.user.id,
      notes: note,
    });

    res.json({ success: true, data: { message: 'Note added' } });
  } catch (error) { next(error); }
});

/**
 * Calculate distance between two coordinates in meters (Haversine)
 */
function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default router;
