/**
 * Vision Agent — analyses uploaded complaint images.
 *
 * Responsibilities:
 *   - Detect issue type from images
 *   - Estimate severity
 *   - Suggest category and tags
 *   - Identify visible hazards
 *
 * Falls back to empty analysis when disabled or no images present.
 */

import { getLLMProvider } from '../shared/llm-provider';
import { AgentResult, VisionAnalysis, AgentMeta } from '../shared/types';
import { logger } from '../../utils/logger';
import { env } from '../../config/env';

interface VisionInput {
  imageUrls: string[];
  existingCategory?: string;
  description?: string;
}

export class VisionAgent {
  static readonly AGENT_NAME = 'vision';

  static async run(input: VisionInput): Promise<AgentResult<VisionAnalysis>> {
    const start = Date.now();

    // Skip if disabled or no images
    if (!env.ENABLE_VISION_AGENT || input.imageUrls.length === 0) {
      return this.buildSkippedResult(start);
    }

    try {
      const provider = getLLMProvider();

      // Use image analysis if available, otherwise use text completion
      let rawResult: string;

      if (provider.analyzeImage && input.imageUrls.length > 0) {
        const prompt = `Analyze this civic complaint image. The citizen described the issue as: "${input.description || 'No description'}".
Respond in JSON with: detectedCategory, severity (low/medium/high/critical), confidence (0-1), reason, visibleHazards (array), suggestedTags (array).`;

        const result = await provider.analyzeImage(input.imageUrls[0], prompt);
        rawResult = result.content;
      } else {
        const result = await provider.complete({
          systemPrompt: `You are a civic complaint image analysis agent. Based on the description and context, infer what the image likely shows.
Respond ONLY in valid JSON with: detectedCategory, severity (low/medium/high/critical), confidence (0-1), reason, visibleHazards (array), suggestedTags (array).`,
          userPrompt: `Description: ${input.description || 'No description'}
Existing category: ${input.existingCategory || 'Unknown'}
Number of images: ${input.imageUrls.length}`,
          responseFormat: 'json',
        });
        rawResult = result.content;
      }

      const parsed = JSON.parse(rawResult) as VisionAnalysis;
      const meta = this.buildMeta(start, parsed.confidence, provider.name);

      logger.info(`[VisionAgent] Analysis complete: ${parsed.detectedCategory} (${parsed.severity}) confidence=${parsed.confidence}`);

      return { success: true, data: parsed, meta };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`[VisionAgent] Error: ${message}`);
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

  private static buildSkippedResult(start: number): AgentResult<VisionAnalysis> {
    return {
      success: true,
      data: {
        detectedCategory: 'Unknown',
        severity: 'medium',
        confidence: 0,
        reason: 'Vision agent skipped (disabled or no images)',
        visibleHazards: [],
        suggestedTags: [],
      },
      meta: this.buildMeta(start, 0, 'skipped'),
    };
  }

  private static buildErrorResult(start: number, error: string): AgentResult<VisionAnalysis> {
    return {
      success: false,
      data: {
        detectedCategory: 'Unknown',
        severity: 'medium',
        confidence: 0,
        reason: 'Vision analysis failed — using manual category',
        visibleHazards: [],
        suggestedTags: [],
      },
      meta: this.buildMeta(start, 0, 'error'),
      error,
    };
  }
}
