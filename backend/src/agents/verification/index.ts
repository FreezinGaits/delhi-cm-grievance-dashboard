/**
 * Verification Agent — verifies officer resolution evidence.
 *
 * Compares before/after images and description to determine whether
 * the issue has actually been fixed. Citizen veto still takes priority.
 */

import { getLLMProvider } from '../shared/llm-provider';
import { AgentResult, VerificationAnalysis, AgentMeta } from '../shared/types';
import { logger } from '../../utils/logger';
import { env } from '../../config/env';

interface VerificationInput {
  complaintTitle: string;
  complaintDescription: string;
  complaintCategory: string;
  resolutionDescription?: string;
  beforeImageUrls: string[];
  afterImageUrls: string[];
}

export class VerificationAgent {
  static readonly AGENT_NAME = 'verification';

  static async run(input: VerificationInput): Promise<AgentResult<VerificationAnalysis>> {
    const start = Date.now();

    if (!env.ENABLE_VERIFICATION_AGENT) {
      return this.buildSkippedResult(start);
    }

    try {
      const provider = getLLMProvider();

      const result = await provider.complete({
        systemPrompt: `You are a civic complaint resolution verification agent.
Given details about a complaint and the officer's resolution evidence, determine if the issue appears to be genuinely fixed.
Be cautious — err on the side of "needs_human_review" when uncertain.

Respond ONLY in valid JSON:
{
  "verdict": "approved" | "rejected" | "needs_human_review",
  "confidence": 0-1,
  "reasoning": "explanation",
  "issuesFound": ["list of concerns"],
  "recommendedAction": "what should happen next"
}`,
        userPrompt: `ORIGINAL COMPLAINT:
Title: "${input.complaintTitle}"
Description: "${input.complaintDescription}"
Category: ${input.complaintCategory}

RESOLUTION EVIDENCE:
Officer's description: "${input.resolutionDescription || 'No description provided'}"
Before images: ${input.beforeImageUrls.length} uploaded
After images: ${input.afterImageUrls.length} uploaded

Note: Image visual analysis may be limited. Focus on the textual evidence and metadata.`,
        responseFormat: 'json',
      });

      const parsed = JSON.parse(result.content) as VerificationAnalysis;

      logger.info(`[VerificationAgent] Verdict=${parsed.verdict} Confidence=${parsed.confidence}`);

      return {
        success: true,
        data: parsed,
        meta: this.buildMeta(start, parsed.confidence, result.model),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`[VerificationAgent] Error: ${message}`);
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

  private static buildSkippedResult(start: number): AgentResult<VerificationAnalysis> {
    return {
      success: true,
      data: {
        verdict: 'needs_human_review',
        confidence: 0,
        reasoning: 'Verification agent disabled — awaiting citizen confirmation',
        issuesFound: [],
        recommendedAction: 'Citizen veto mechanism will handle verification',
      },
      meta: this.buildMeta(start, 0, 'skipped'),
    };
  }

  private static buildErrorResult(start: number, error: string): AgentResult<VerificationAnalysis> {
    return {
      success: false,
      data: {
        verdict: 'needs_human_review',
        confidence: 0,
        reasoning: 'Verification analysis failed — defaulting to human review',
        issuesFound: [],
        recommendedAction: 'Manual review required',
      },
      meta: this.buildMeta(start, 0, 'error'),
      error,
    };
  }
}
