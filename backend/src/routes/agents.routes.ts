/**
 * Agent API Routes — expose the agentic AI capabilities.
 *
 * Endpoints:
 *   POST /api/v1/agents/analyze        — Trigger full analysis for a complaint
 *   POST /api/v1/agents/reverify       — Re-verify resolution evidence
 *   GET  /api/v1/agents/advisor        — Generate CM executive briefing
 *   GET  /api/v1/agents/history/:id    — Get AI decision history for a complaint
 *   POST /api/v1/agents/test           — Test agent pipeline with mock data
 */

import { Router, Request, Response, NextFunction } from 'express';
import { ComplaintAgentOrchestrator } from '../agents/orchestrator';
import { AIAnalysis } from '../models/AIAnalysis';
import { AgentDecision } from '../models/AgentDecision';
import { Complaint } from '../models/Complaint';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /analyze — Run the full AI analysis pipeline on a complaint.
 * Body: { complaintId: string }
 */
router.post('/analyze', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { complaintId } = req.body;

    if (!complaintId) {
      return res.status(400).json({ success: false, error: { message: 'complaintId is required' } });
    }

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({ success: false, error: { message: 'Complaint not found' } });
    }

    const imageUrls = (complaint.media || [])
      .filter(m => m.type === 'image')
      .map(m => m.url);

    // Detect critical keywords
    const CRITICAL_KEYWORDS = ['open manhole', 'manhole', 'live wire', 'gas leak', 'collapse', 'fire', 'flood', 'sinkhole'];
    const text = `${complaint.title} ${complaint.description}`.toLowerCase();
    const isCriticalKeyword = CRITICAL_KEYWORDS.some(kw => text.includes(kw));

    const analysis = await ComplaintAgentOrchestrator.analyzeComplaint({
      complaintId: complaint._id.toString(),
      title: complaint.title,
      description: complaint.description,
      category: complaint.category,
      latitude: complaint.location.coordinates[1],
      longitude: complaint.location.coordinates[0],
      imageUrls,
      ward: complaint.address?.ward,
      district: complaint.address?.district,
      isCriticalKeyword,
    });

    return res.json({ success: true, data: analysis });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /reverify — Re-verify resolution evidence for a complaint.
 * Body: { complaintId: string, resolutionDescription?: string }
 */
router.post('/reverify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { complaintId, resolutionDescription } = req.body;

    if (!complaintId) {
      return res.status(400).json({ success: false, error: { message: 'complaintId is required' } });
    }

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({ success: false, error: { message: 'Complaint not found' } });
    }

    const beforeImageUrls = (complaint.media || []).filter(m => m.type === 'image').map(m => m.url);
    const afterImageUrls = (complaint.resolutionEvidence?.media || []).map(m => m.url);

    const result = await ComplaintAgentOrchestrator.verifyResolution(
      complaint._id.toString(),
      complaint.title,
      complaint.description,
      complaint.category,
      resolutionDescription || complaint.resolutionEvidence?.description || '',
      beforeImageUrls,
      afterImageUrls,
    );

    // Persist verification result
    await AIAnalysis.findOneAndUpdate(
      { complaintId: complaint._id },
      {
        verification: {
          verdict: result.data.verdict,
          confidence: result.data.confidence,
          reasoning: result.data.reasoning,
          issuesFound: result.data.issuesFound,
        },
      },
      { upsert: true },
    );

    return res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /advisor — Generate CM executive briefing.
 */
router.get('/advisor', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const briefing = await ComplaintAgentOrchestrator.generateBriefing();
    return res.json({ success: true, data: briefing });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /history/:complaintId — Get AI decision history for a complaint.
 */
router.get('/history/:complaintId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { complaintId } = req.params;

    const [analysis, decisions] = await Promise.all([
      AIAnalysis.findOne({ complaintId }).lean(),
      AgentDecision.find({ complaintId }).sort({ createdAt: -1 }).lean(),
    ]);

    return res.json({
      success: true,
      data: {
        analysis,
        decisions,
        totalDecisions: decisions.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /test — Test the agent pipeline with synthetic data.
 * No real complaint is created.
 */
router.post('/test', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const mockInput = {
      complaintId: 'test-' + Date.now(),
      title: 'Large pothole on main road near school',
      description: 'There is a dangerous pothole approximately 2 feet deep on the main road near DPS School in Dwarka Sector 12. Multiple vehicles have been damaged. Children crossing the road are at risk.',
      category: 'Roads',
      latitude: 28.5921,
      longitude: 77.0460,
      imageUrls: ['mock://test-image-001.jpg'],
      ward: 'Dwarka',
      district: 'South West Delhi',
      isCriticalKeyword: false,
    };

    logger.info('[AgentAPI] Running test pipeline...');

    // Run agents but skip DB persistence for test
    const { VisionAgent } = await import('../agents/vision');
    const { DuplicateAgent } = await import('../agents/duplicate');
    const { PriorityAgent } = await import('../agents/priority');
    const { RoutingAgent } = await import('../agents/routing');

    const [vision, priority, routing] = await Promise.all([
      VisionAgent.run({ imageUrls: mockInput.imageUrls, existingCategory: mockInput.category, description: mockInput.description }),
      PriorityAgent.run({
        title: mockInput.title, description: mockInput.description, category: mockInput.category,
        latitude: mockInput.latitude, longitude: mockInput.longitude,
        duplicateCount: 0, hasMedia: true, isCriticalKeyword: false,
      }),
      RoutingAgent.run({ title: mockInput.title, description: mockInput.description, category: mockInput.category, ward: mockInput.ward, district: mockInput.district }),
    ]);

    return res.json({
      success: true,
      data: {
        testInput: mockInput,
        results: { vision, priority, routing },
        message: 'Agent pipeline test complete. All agents responded.',
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
