/**
 * Duplicate Agent — enhances DBSCAN clustering with LLM semantic comparison.
 *
 * Pipeline: Existing DBSCAN output → LLM semantic comparison → master incident decision.
 * The existing DBSCAN clustering remains untouched. This agent adds an
 * additional semantic layer on top.
 */

import { getLLMProvider } from '../shared/llm-provider';
import { AgentResult, DuplicateAnalysis, AgentMeta } from '../shared/types';
import { logger } from '../../utils/logger';
import { env } from '../../config/env';
import { Complaint } from '../../models/Complaint';

interface DuplicateInput {
  complaintId: string;
  title: string;
  description: string;
  category: string;
  latitude: number;
  longitude: number;
}

export class DuplicateAgent {
  static readonly AGENT_NAME = 'duplicate';
  private static readonly SEARCH_RADIUS_METERS = 500;

  static async run(input: DuplicateInput): Promise<AgentResult<DuplicateAnalysis>> {
    const start = Date.now();

    if (!env.ENABLE_DUPLICATE_AGENT) {
      return this.buildSkippedResult(start);
    }

    try {
      // Step 1: Find nearby complaints using existing geo index
      const nearbyComplaints = await Complaint.find({
        _id: { $ne: input.complaintId },
        isDeleted: false,
        location: {
          $nearSphere: {
            $geometry: {
              type: 'Point',
              coordinates: [input.longitude, input.latitude],
            },
            $maxDistance: this.SEARCH_RADIUS_METERS,
          },
        },
        category: input.category,
      })
        .select('referenceNumber title description category')
        .limit(10)
        .lean();

      if (nearbyComplaints.length === 0) {
        return {
          success: true,
          data: {
            isDuplicate: false,
            candidates: [],
            reasoning: 'No nearby complaints in the same category found within search radius',
          },
          meta: this.buildMeta(start, 1.0, 'geo-query'),
        };
      }

      // Step 2: Ask LLM for semantic comparison
      const provider = getLLMProvider();

      const candidateDescriptions = nearbyComplaints.map((c, i) =>
        `[${i + 1}] Ref: ${c.referenceNumber} | Title: "${c.title}" | Desc: "${(c.description || '').slice(0, 200)}"`
      ).join('\n');

      const result = await provider.complete({
        systemPrompt: `You are a duplicate complaint detection agent for a civic governance system.
Given a NEW complaint and a list of EXISTING nearby complaints (same category, within 500m radius),
determine if the new complaint describes the same real-world issue as any existing one.

Respond ONLY in valid JSON:
{
  "isDuplicate": boolean,
  "masterTicketId": "referenceNumber of best match or null",
  "candidates": [{ "referenceNumber": "...", "similarityScore": 0-1, "reason": "..." }],
  "reasoning": "explanation"
}`,
        userPrompt: `NEW COMPLAINT:
Title: "${input.title}"
Description: "${input.description}"
Category: ${input.category}

NEARBY EXISTING COMPLAINTS:
${candidateDescriptions}`,
        responseFormat: 'json',
      });

      const parsed = JSON.parse(result.content);

      // Map parsed candidates to include complaintId
      const candidates = (parsed.candidates || []).map((c: Record<string, unknown>) => {
        const match = nearbyComplaints.find(nc => nc.referenceNumber === c.referenceNumber);
        return {
          complaintId: match?._id?.toString() || '',
          referenceNumber: c.referenceNumber as string || '',
          similarityScore: c.similarityScore as number || 0,
          reason: c.reason as string || '',
        };
      });

      const analysis: DuplicateAnalysis = {
        isDuplicate: parsed.isDuplicate || false,
        masterTicketId: parsed.masterTicketId || undefined,
        candidates,
        reasoning: parsed.reasoning || 'Analysis complete',
      };

      const confidence = analysis.isDuplicate
        ? Math.max(...candidates.map((c: { similarityScore: number }) => c.similarityScore), 0)
        : 1.0;

      logger.info(`[DuplicateAgent] isDuplicate=${analysis.isDuplicate}, candidates=${candidates.length}`);

      return {
        success: true,
        data: analysis,
        meta: this.buildMeta(start, confidence, result.model),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`[DuplicateAgent] Error: ${message}`);
      return this.buildErrorResult(start, message);
    }
  }

  private static buildMeta(start: number, confidence: number, model: string): AgentMeta {
    return {
      agentName: this.AGENT_NAME,
      model,
      executionTimeMs: Date.now() - start,
      timestamp: new Date(),
      confidence,
      isMock: model.includes('mock'),
    };
  }

  private static buildSkippedResult(start: number): AgentResult<DuplicateAnalysis> {
    return {
      success: true,
      data: { isDuplicate: false, candidates: [], reasoning: 'Duplicate agent disabled' },
      meta: this.buildMeta(start, 0, 'skipped'),
    };
  }

  private static buildErrorResult(start: number, error: string): AgentResult<DuplicateAnalysis> {
    return {
      success: false,
      data: { isDuplicate: false, candidates: [], reasoning: 'Duplicate analysis failed — falling back to DBSCAN only' },
      meta: this.buildMeta(start, 0, 'error'),
      error,
    };
  }
}
