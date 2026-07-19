/**
 * Priority Agent — determines complaint urgency using multi-factor analysis.
 *
 * Factors considered:
 *   - Category and severity
 *   - Location context (residential, commercial, near critical infrastructure)
 *   - Duplicate count (more citizens = higher urgency)
 *   - Historical complaint density in the area
 *   - Critical keyword detection
 */

import { getLLMProvider } from '../shared/llm-provider';
import { AgentResult, PriorityAnalysis, AgentMeta } from '../shared/types';
import { logger } from '../../utils/logger';
import { env } from '../../config/env';
import { Complaint } from '../../models/Complaint';

interface PriorityInput {
  title: string;
  description: string;
  category: string;
  latitude: number;
  longitude: number;
  duplicateCount: number;
  hasMedia: boolean;
  isCriticalKeyword: boolean;
}

export class PriorityAgent {
  static readonly AGENT_NAME = 'priority';

  static async run(input: PriorityInput): Promise<AgentResult<PriorityAnalysis>> {
    const start = Date.now();

    if (!env.ENABLE_PRIORITY_AGENT) {
      return this.buildSkippedResult(start);
    }

    try {
      // Gather contextual data
      const historicalCount = await Complaint.countDocuments({
        isDeleted: false,
        location: {
          $nearSphere: {
            $geometry: {
              type: 'Point',
              coordinates: [input.longitude, input.latitude],
            },
            $maxDistance: 1000,
          },
        },
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 3600000) },
      });

      const provider = getLLMProvider();

      const result = await provider.complete({
        systemPrompt: `You are a civic complaint priority assessment agent.
Analyze the complaint and contextual factors to determine urgency.

Respond ONLY in valid JSON:
{
  "score": 0-100,
  "level": "low" | "normal" | "high" | "critical",
  "suggestedSlaHours": number,
  "reasoning": "explanation",
  "factors": [{ "factor": "name", "impact": "positive" | "negative" | "neutral", "weight": 0-1 }]
}

Score guide: 0-25 low, 26-50 normal, 51-75 high, 76-100 critical.`,
        userPrompt: `COMPLAINT:
Title: "${input.title}"
Description: "${input.description}"
Category: ${input.category}

CONTEXT:
- Duplicate reports in area: ${input.duplicateCount}
- Historical complaints nearby (30 days): ${historicalCount}
- Has photographic evidence: ${input.hasMedia}
- Critical keyword detected: ${input.isCriticalKeyword}
- GPS coordinates: ${input.latitude}, ${input.longitude}`,
        responseFormat: 'json',
      });

      const parsed = JSON.parse(result.content) as PriorityAnalysis;

      logger.info(`[PriorityAgent] Score=${parsed.score} Level=${parsed.level} SLA=${parsed.suggestedSlaHours}h`);

      return {
        success: true,
        data: parsed,
        meta: this.buildMeta(start, parsed.score / 100, result.model),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`[PriorityAgent] Error: ${message}`);
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

  private static buildSkippedResult(start: number): AgentResult<PriorityAnalysis> {
    return {
      success: true,
      data: {
        score: 50,
        level: 'normal',
        suggestedSlaHours: 72,
        reasoning: 'Priority agent disabled — using default priority',
        factors: [],
      },
      meta: this.buildMeta(start, 0, 'skipped'),
    };
  }

  private static buildErrorResult(start: number, error: string): AgentResult<PriorityAnalysis> {
    return {
      success: false,
      data: {
        score: 50,
        level: 'normal',
        suggestedSlaHours: 72,
        reasoning: 'Priority analysis failed — using default',
        factors: [],
      },
      meta: this.buildMeta(start, 0, 'error'),
      error,
    };
  }
}
