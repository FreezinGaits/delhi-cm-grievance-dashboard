/**
 * LLM Provider abstraction layer.
 *
 * Selects the provider based on the AI_PROVIDER env variable.
 * Falls back to MockProvider when no API key is present.
 *
 * Supported providers:
 *   - mock     (default, deterministic, no API key)
 *   - openai   (requires OPENAI_API_KEY)
 *   - gemini   (requires GEMINI_API_KEY)
 *   - groq     (requires GROQ_API_KEY)
 */

import { LLMProvider, LLMCompletionOptions, LLMCompletionResult } from './types';
import { logger } from '../../utils/logger';

// ── Mock Provider ───────────────────────────────────────────

export class MockProvider implements LLMProvider {
  readonly name = 'mock';

  async complete(options: LLMCompletionOptions): Promise<LLMCompletionResult> {
    logger.debug(`[MockProvider] complete() called with ${options.userPrompt.slice(0, 80)}...`);

    // Return deterministic JSON or text based on the system prompt context
    const content = this.generateMockResponse(options);

    return {
      content,
      model: 'mock-v1',
      tokensUsed: 0,
    };
  }

  async analyzeImage(imageUrl: string, prompt: string): Promise<LLMCompletionResult> {
    logger.debug(`[MockProvider] analyzeImage() called for ${imageUrl}`);

    const response = {
      detectedCategory: 'Pothole',
      severity: 'high',
      confidence: 0.87,
      reason: 'Mock analysis: detected road surface damage in uploaded image',
      visibleHazards: ['road depression', 'standing water'],
      suggestedTags: ['pothole', 'road-damage', 'safety-hazard'],
    };

    return {
      content: JSON.stringify(response),
      model: 'mock-vision-v1',
      tokensUsed: 0,
    };
  }

  private generateMockResponse(options: LLMCompletionOptions): string {
    const sys = options.systemPrompt.toLowerCase();

    if (sys.includes('priority')) {
      return JSON.stringify({
        score: 65,
        level: 'high',
        suggestedSlaHours: 48,
        reasoning: 'Mock assessment: moderate severity issue in residential area',
        factors: [
          { factor: 'category_severity', impact: 'negative', weight: 0.3 },
          { factor: 'residential_area', impact: 'negative', weight: 0.2 },
          { factor: 'no_immediate_danger', impact: 'positive', weight: 0.15 },
        ],
      });
    }

    if (sys.includes('duplicate') || sys.includes('similarity')) {
      return JSON.stringify({
        isDuplicate: false,
        reasoning: 'Mock assessment: no strong semantic overlap with nearby complaints',
        candidates: [],
      });
    }

    if (sys.includes('routing') || sys.includes('department')) {
      return JSON.stringify({
        primaryDepartment: {
          departmentCode: 'PWD',
          departmentName: 'Public Works Department',
          confidence: 0.82,
          reason: 'Mock routing: road-related issue maps to PWD',
        },
        secondaryDepartments: [],
        escalationLevel: 0,
        reasoning: 'Mock assessment: single department sufficient',
      });
    }

    if (sys.includes('verification') || sys.includes('resolution')) {
      return JSON.stringify({
        verdict: 'needs_human_review',
        confidence: 0.6,
        reasoning: 'Mock assessment: unable to definitively confirm resolution from images alone',
        issuesFound: [],
        recommendedAction: 'Request officer to provide additional evidence or schedule field inspection',
      });
    }

    if (sys.includes('advisor') || sys.includes('briefing') || sys.includes('executive')) {
      return JSON.stringify({
        summary: 'Mock morning briefing: 12 new complaints overnight, 3 critical. Water supply issues trending upward in South Delhi. Officer workload balanced.',
        urgentIncidents: [
          {
            complaintId: 'mock-001',
            referenceNumber: 'DEL-20260718-00001',
            title: 'Open manhole near school',
            reason: 'Life-threatening hazard near educational institution',
            suggestedAction: 'Dispatch emergency team within 4 hours',
          },
        ],
        departmentAlerts: [
          {
            departmentName: 'Delhi Jal Board',
            metric: 'SLA Breach Rate',
            value: 35,
            threshold: 20,
            recommendation: 'Investigate resource allocation in South Delhi zone',
          },
        ],
        officerFlags: [],
        predictedHotspots: [
          {
            area: 'Dwarka Sector 12',
            riskType: 'Waterlogging',
            riskLevel: 'high',
            reasoning: 'Mock prediction: monsoon season + historical complaint density',
          },
        ],
        suggestedActions: [
          'Review DJB resource allocation in South Delhi',
          'Schedule field visit to Dwarka Sector 12',
          'Follow up on 3 SLA-breached critical complaints',
        ],
      });
    }

    // Default fallback
    return JSON.stringify({
      analysis: 'Mock analysis completed',
      confidence: 0.75,
      reasoning: 'Deterministic mock response for development and testing',
    });
  }
}

// ── OpenAI Provider (stub — requires OPENAI_API_KEY) ────────

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai';

  async complete(options: LLMCompletionOptions): Promise<LLMCompletionResult> {
    // In a production build, this would use the OpenAI SDK.
    // For now, log and fall back gracefully.
    logger.warn('[OpenAIProvider] OpenAI integration not yet configured — falling back');
    return new MockProvider().complete(options);
  }

  async analyzeImage(imageUrl: string, prompt: string): Promise<LLMCompletionResult> {
    logger.warn('[OpenAIProvider] OpenAI Vision not yet configured — falling back');
    return new MockProvider().analyzeImage(imageUrl, prompt);
  }
}

// ── Gemini Provider (stub — requires GEMINI_API_KEY) ────────

export class GeminiProvider implements LLMProvider {
  readonly name = 'gemini';

  async complete(options: LLMCompletionOptions): Promise<LLMCompletionResult> {
    logger.warn('[GeminiProvider] Gemini integration not yet configured — falling back');
    return new MockProvider().complete(options);
  }

  async analyzeImage(imageUrl: string, prompt: string): Promise<LLMCompletionResult> {
    logger.warn('[GeminiProvider] Gemini Vision not yet configured — falling back');
    return new MockProvider().analyzeImage(imageUrl, prompt);
  }
}

// ── Groq Provider (stub — requires GROQ_API_KEY) ────────────

export class GroqProvider implements LLMProvider {
  readonly name = 'groq';

  async complete(options: LLMCompletionOptions): Promise<LLMCompletionResult> {
    logger.warn('[GroqProvider] Groq integration not yet configured — falling back');
    return new MockProvider().complete(options);
  }
}

// ── Factory ─────────────────────────────────────────────────

let cachedProvider: LLMProvider | null = null;

export function getLLMProvider(): LLMProvider {
  if (cachedProvider) return cachedProvider;

  const providerName = (process.env.AI_PROVIDER || 'mock').toLowerCase();
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasGroq = !!process.env.GROQ_API_KEY;

  switch (providerName) {
    case 'openai':
      if (!hasOpenAI) {
        logger.warn('[LLM] AI_PROVIDER=openai but OPENAI_API_KEY missing — using MockProvider');
        cachedProvider = new MockProvider();
      } else {
        cachedProvider = new OpenAIProvider();
      }
      break;

    case 'gemini':
      if (!hasGemini) {
        logger.warn('[LLM] AI_PROVIDER=gemini but GEMINI_API_KEY missing — using MockProvider');
        cachedProvider = new MockProvider();
      } else {
        cachedProvider = new GeminiProvider();
      }
      break;

    case 'groq':
      if (!hasGroq) {
        logger.warn('[LLM] AI_PROVIDER=groq but GROQ_API_KEY missing — using MockProvider');
        cachedProvider = new MockProvider();
      } else {
        cachedProvider = new GroqProvider();
      }
      break;

    default:
      cachedProvider = new MockProvider();
      logger.info('[LLM] Using MockProvider (no AI_PROVIDER set or set to "mock")');
      break;
  }

  logger.info(`[LLM] Active provider: ${cachedProvider.name}`);
  return cachedProvider;
}

/**
 * Reset provider cache (useful for testing).
 */
export function resetLLMProvider(): void {
  cachedProvider = null;
}
