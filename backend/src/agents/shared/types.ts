/**
 * Shared type definitions for the Agentic AI layer.
 *
 * Every agent returns an AgentResult wrapping its domain-specific payload.
 * The orchestrator collects these into a ComplaintAnalysis.
 */

// ── Agent metadata attached to every decision ───────────────

export interface AgentMeta {
  agentName: string;
  model: string;
  executionTimeMs: number;
  timestamp: Date;
  confidence: number;
  isMock: boolean;
}

// ── Generic wrapper returned by every agent ─────────────────

export interface AgentResult<T> {
  success: boolean;
  data: T;
  meta: AgentMeta;
  error?: string;
}

// ── Vision Agent ────────────────────────────────────────────

export interface VisionAnalysis {
  detectedCategory: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  reason: string;
  visibleHazards: string[];
  suggestedTags: string[];
}

// ── Duplicate Agent ─────────────────────────────────────────

export interface DuplicateCandidate {
  complaintId: string;
  referenceNumber: string;
  similarityScore: number;
  reason: string;
}

export interface DuplicateAnalysis {
  isDuplicate: boolean;
  masterTicketId?: string;
  candidates: DuplicateCandidate[];
  reasoning: string;
}

// ── Priority Agent ──────────────────────────────────────────

export interface PriorityAnalysis {
  score: number;              // 0-100
  level: 'low' | 'normal' | 'high' | 'critical';
  suggestedSlaHours: number;
  reasoning: string;
  factors: Array<{
    factor: string;
    impact: 'positive' | 'negative' | 'neutral';
    weight: number;
  }>;
}

// ── Routing Agent ───────────────────────────────────────────

export interface RoutingSuggestion {
  departmentCode: string;
  departmentName: string;
  confidence: number;
  reason: string;
}

export interface RoutingAnalysis {
  primaryDepartment: RoutingSuggestion;
  secondaryDepartments: RoutingSuggestion[];
  escalationLevel: number;
  reasoning: string;
}

// ── Verification Agent ──────────────────────────────────────

export interface VerificationAnalysis {
  verdict: 'approved' | 'rejected' | 'needs_human_review';
  confidence: number;
  reasoning: string;
  issuesFound: string[];
  recommendedAction: string;
}

// ── CM Advisor Agent ────────────────────────────────────────

export interface AdvisorBriefing {
  generatedAt: Date;
  summary: string;
  urgentIncidents: Array<{
    complaintId: string;
    referenceNumber: string;
    title: string;
    reason: string;
    suggestedAction: string;
  }>;
  departmentAlerts: Array<{
    departmentName: string;
    metric: string;
    value: number;
    threshold: number;
    recommendation: string;
  }>;
  officerFlags: Array<{
    officerName: string;
    issue: string;
    recommendation: string;
  }>;
  predictedHotspots: Array<{
    area: string;
    riskType: string;
    riskLevel: 'moderate' | 'high' | 'critical';
    reasoning: string;
  }>;
  suggestedActions: string[];
}

// ── Orchestrator (combined analysis) ────────────────────────

export interface ComplaintAnalysis {
  complaintId: string;
  vision?: AgentResult<VisionAnalysis>;
  duplicate?: AgentResult<DuplicateAnalysis>;
  priority?: AgentResult<PriorityAnalysis>;
  routing?: AgentResult<RoutingAnalysis>;
  orchestratorMeta: {
    totalExecutionTimeMs: number;
    agentsRun: string[];
    agentsSkipped: string[];
    timestamp: Date;
  };
}

// ── LLM Provider contract ───────────────────────────────────

export interface LLMCompletionOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'json' | 'text';
}

export interface LLMCompletionResult {
  content: string;
  model: string;
  tokensUsed?: number;
}

export interface LLMProvider {
  readonly name: string;
  complete(options: LLMCompletionOptions): Promise<LLMCompletionResult>;
  analyzeImage?(imageUrl: string, prompt: string): Promise<LLMCompletionResult>;
}
