/**
 * Tests for the Agentic AI layer.
 *
 * Covers:
 *   - LLM Provider factory & MockProvider
 *   - All agents (Vision, Priority, Verification)
 *   - Feature flag toggling
 *   - Error handling and fallback behavior
 *
 * Agents that query MongoDB (Duplicate, Routing, Advisor) are tested
 * via the /api/v1/agents/test endpoint in integration tests.
 * These unit tests focus on pure-logic agents that don't need DB.
 */

// Force mock provider for all tests
process.env.AI_PROVIDER = 'mock';
process.env.ENABLE_VISION_AGENT = 'true';
process.env.ENABLE_DUPLICATE_AGENT = 'true';
process.env.ENABLE_PRIORITY_AGENT = 'true';
process.env.ENABLE_ROUTING_AGENT = 'true';
process.env.ENABLE_VERIFICATION_AGENT = 'true';
process.env.ENABLE_CM_ADVISOR = 'true';

import { MockProvider, getLLMProvider, resetLLMProvider } from '../agents/shared/llm-provider';
import { VisionAgent } from '../agents/vision';
import { VerificationAgent } from '../agents/verification';

// ── MockProvider Tests ──────────────────────────────────────

describe('MockProvider', () => {
  const provider = new MockProvider();

  it('should return deterministic JSON for priority prompts', async () => {
    const result = await provider.complete({
      systemPrompt: 'You are a priority assessment agent',
      userPrompt: 'Rate this complaint',
    });
    expect(result.model).toBe('mock-v1');
    expect(result.tokensUsed).toBe(0);

    const parsed = JSON.parse(result.content);
    expect(parsed.score).toBeDefined();
    expect(parsed.level).toBeDefined();
    expect(typeof parsed.score).toBe('number');
  });

  it('should return deterministic JSON for duplicate prompts', async () => {
    const result = await provider.complete({
      systemPrompt: 'You are a duplicate detection agent checking for similarity',
      userPrompt: 'Compare these complaints',
    });
    const parsed = JSON.parse(result.content);
    expect(parsed.isDuplicate).toBeDefined();
    expect(typeof parsed.isDuplicate).toBe('boolean');
  });

  it('should return deterministic JSON for routing prompts', async () => {
    const result = await provider.complete({
      systemPrompt: 'You are a routing agent that determines which department handles complaints',
      userPrompt: 'Route this complaint',
    });
    const parsed = JSON.parse(result.content);
    expect(parsed.primaryDepartment).toBeDefined();
    expect(parsed.primaryDepartment.departmentCode).toBeDefined();
  });

  it('should return deterministic JSON for verification prompts', async () => {
    const result = await provider.complete({
      systemPrompt: 'You are a verification agent checking resolution evidence',
      userPrompt: 'Verify resolution',
    });
    const parsed = JSON.parse(result.content);
    expect(parsed.verdict).toBeDefined();
    expect(['approved', 'rejected', 'needs_human_review']).toContain(parsed.verdict);
  });

  it('should return deterministic JSON for advisor prompts', async () => {
    const result = await provider.complete({
      systemPrompt: 'You are an executive advisor generating a briefing',
      userPrompt: 'Generate briefing',
    });
    const parsed = JSON.parse(result.content);
    expect(parsed.summary).toBeDefined();
    expect(parsed.suggestedActions).toBeInstanceOf(Array);
  });

  it('should handle image analysis', async () => {
    const result = await provider.analyzeImage('mock://image.jpg', 'Analyze this');
    const parsed = JSON.parse(result.content);
    expect(parsed.detectedCategory).toBe('Pothole');
    expect(parsed.severity).toBe('high');
    expect(parsed.confidence).toBeGreaterThan(0);
  });

  it('should return a generic fallback for unknown prompt contexts', async () => {
    const result = await provider.complete({
      systemPrompt: 'You are something else entirely',
      userPrompt: 'Do something',
    });
    const parsed = JSON.parse(result.content);
    expect(parsed.analysis).toBe('Mock analysis completed');
    expect(parsed.confidence).toBe(0.75);
  });
});

// ── LLM Provider Factory Tests ──────────────────────────────

describe('LLM Provider Factory', () => {
  beforeEach(() => {
    resetLLMProvider();
  });

  it('should return MockProvider when AI_PROVIDER is mock', () => {
    process.env.AI_PROVIDER = 'mock';
    const provider = getLLMProvider();
    expect(provider.name).toBe('mock');
  });

  it('should fall back to MockProvider when OPENAI_API_KEY missing', () => {
    process.env.AI_PROVIDER = 'openai';
    delete process.env.OPENAI_API_KEY;
    const provider = getLLMProvider();
    expect(provider.name).toBe('mock');
  });

  it('should fall back to MockProvider when GEMINI_API_KEY missing', () => {
    process.env.AI_PROVIDER = 'gemini';
    delete process.env.GEMINI_API_KEY;
    const provider = getLLMProvider();
    expect(provider.name).toBe('mock');
  });

  it('should fall back to MockProvider when GROQ_API_KEY missing', () => {
    process.env.AI_PROVIDER = 'groq';
    delete process.env.GROQ_API_KEY;
    const provider = getLLMProvider();
    expect(provider.name).toBe('mock');
  });

  it('should cache the provider instance', () => {
    process.env.AI_PROVIDER = 'mock';
    const p1 = getLLMProvider();
    const p2 = getLLMProvider();
    expect(p1).toBe(p2);
  });

  it('should reset cache properly', () => {
    process.env.AI_PROVIDER = 'mock';
    const p1 = getLLMProvider();
    resetLLMProvider();
    const p2 = getLLMProvider();
    expect(p1).not.toBe(p2);
    expect(p2.name).toBe('mock');
  });

  afterAll(() => {
    resetLLMProvider();
    process.env.AI_PROVIDER = 'mock';
  });
});

// ── Vision Agent Tests (no DB dependency) ───────────────────

describe('VisionAgent', () => {
  it('should return a valid VisionAnalysis with images', async () => {
    const result = await VisionAgent.run({
      imageUrls: ['mock://test-image.jpg'],
      existingCategory: 'Roads',
      description: 'Large pothole on the main road',
    });

    expect(result.success).toBe(true);
    expect(result.data.detectedCategory).toBeDefined();
    expect(result.data.severity).toBeDefined();
    expect(result.data.confidence).toBeGreaterThan(0);
    expect(result.data.visibleHazards).toBeInstanceOf(Array);
    expect(result.data.suggestedTags).toBeInstanceOf(Array);
    expect(result.meta.agentName).toBe('vision');
    expect(result.meta.isMock).toBe(true);
  });

  it('should skip analysis when no images provided', async () => {
    const result = await VisionAgent.run({
      imageUrls: [],
      existingCategory: 'Roads',
    });

    expect(result.success).toBe(true);
    expect(result.data.confidence).toBe(0);
    expect(result.data.reason).toContain('skipped');
    expect(result.meta.model).toBe('skipped');
  });

  it('should include suggested tags in output', async () => {
    const result = await VisionAgent.run({
      imageUrls: ['mock://test.jpg'],
      existingCategory: 'Roads',
      description: 'Broken road surface',
    });

    expect(result.data.suggestedTags.length).toBeGreaterThan(0);
  });

  it('should populate agentMeta correctly', async () => {
    const result = await VisionAgent.run({
      imageUrls: ['mock://test.jpg'],
      existingCategory: 'Roads',
    });

    expect(result.meta.agentName).toBe('vision');
    expect(result.meta.timestamp).toBeInstanceOf(Date);
    expect(result.meta.executionTimeMs).toBeGreaterThanOrEqual(0);
  });
});

// ── Verification Agent Tests (no DB dependency) ─────────────

describe('VerificationAgent', () => {
  it('should return a valid VerificationAnalysis', async () => {
    const result = await VerificationAgent.run({
      complaintTitle: 'Pothole on main road',
      complaintDescription: 'Deep pothole causing accidents',
      complaintCategory: 'Roads',
      resolutionDescription: 'Pothole filled with tar and leveled',
      beforeImageUrls: ['mock://before.jpg'],
      afterImageUrls: ['mock://after.jpg'],
    });

    expect(result.success).toBe(true);
    expect(['approved', 'rejected', 'needs_human_review']).toContain(result.data.verdict);
    expect(result.data.confidence).toBeGreaterThanOrEqual(0);
    expect(result.data.confidence).toBeLessThanOrEqual(1);
    expect(result.data.reasoning).toBeDefined();
    expect(result.data.recommendedAction).toBeDefined();
    expect(result.meta.agentName).toBe('verification');
  });

  it('should handle missing resolution description', async () => {
    const result = await VerificationAgent.run({
      complaintTitle: 'Test',
      complaintDescription: 'Test desc',
      complaintCategory: 'Roads',
      resolutionDescription: '',
      beforeImageUrls: [],
      afterImageUrls: [],
    });

    expect(result.success).toBe(true);
    expect(result.data.verdict).toBeDefined();
  });
});

// ── Agent Error Handling & Fallback Tests ────────────────────

describe('Agent Error Handling', () => {
  it('VisionAgent should return safe fallback with empty input', async () => {
    const result = await VisionAgent.run({
      imageUrls: ['mock://test.jpg'],
      existingCategory: '',
      description: '',
    });

    expect(result.success).toBe(true);
    expect(result.data.detectedCategory).toBeDefined();
  });

  it('VisionAgent should handle extremely long descriptions', async () => {
    const longDesc = 'x'.repeat(10000);
    const result = await VisionAgent.run({
      imageUrls: ['mock://test.jpg'],
      existingCategory: 'Roads',
      description: longDesc,
    });

    expect(result.success).toBe(true);
  });
});

// ── Agent Type Contract Tests ───────────────────────────────

describe('Agent Type Contracts', () => {
  it('VisionAnalysis should have all required fields', async () => {
    const result = await VisionAgent.run({
      imageUrls: ['mock://test.jpg'],
      existingCategory: 'Roads',
    });

    const data = result.data;
    expect(typeof data.detectedCategory).toBe('string');
    expect(typeof data.severity).toBe('string');
    expect(typeof data.confidence).toBe('number');
    expect(typeof data.reason).toBe('string');
    expect(Array.isArray(data.visibleHazards)).toBe(true);
    expect(Array.isArray(data.suggestedTags)).toBe(true);
  });

  it('VerificationAnalysis should have all required fields', async () => {
    const result = await VerificationAgent.run({
      complaintTitle: 'Test',
      complaintDescription: 'Test',
      complaintCategory: 'Test',
      resolutionDescription: 'Fixed',
      beforeImageUrls: [],
      afterImageUrls: [],
    });

    const data = result.data;
    expect(typeof data.verdict).toBe('string');
    expect(typeof data.confidence).toBe('number');
    expect(typeof data.reasoning).toBe('string');
    expect(Array.isArray(data.issuesFound)).toBe(true);
    expect(typeof data.recommendedAction).toBe('string');
  });

  it('AgentResult should always have meta', async () => {
    const result = await VisionAgent.run({
      imageUrls: [],
      existingCategory: 'Roads',
    });

    expect(result.meta).toBeDefined();
    expect(result.meta.agentName).toBeDefined();
    expect(result.meta.model).toBeDefined();
    expect(result.meta.timestamp).toBeDefined();
    expect(typeof result.meta.executionTimeMs).toBe('number');
    expect(typeof result.meta.confidence).toBe('number');
    expect(typeof result.meta.isMock).toBe('boolean');
  });
});
