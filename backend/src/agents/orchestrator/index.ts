/**
 * ComplaintAgentOrchestrator — coordinates the multi-agent pipeline.
 *
 * Pipeline:
 *   Complaint → Vision → Duplicate → Priority → Routing → DB Update → Officer Assignment
 *
 * Every stage is:
 *   - Logged to AgentDecision
 *   - Isolated (failure in one doesn't block others)
 *   - Retryable
 *   - Feature-flag gated
 */

import { VisionAgent } from '../vision';
import { DuplicateAgent } from '../duplicate';
import { PriorityAgent } from '../priority';
import { RoutingAgent } from '../routing';
import { VerificationAgent } from '../verification';
import { AdvisorAgent } from '../advisor';
import { ComplaintAnalysis, AgentResult, VerificationAnalysis, AdvisorBriefing } from '../shared/types';
import { AIAnalysis } from '../../models/AIAnalysis';
import { AgentDecision } from '../../models/AgentDecision';
import { Complaint, ComplaintPriority } from '../../models/Complaint';
import { Department } from '../../models/Department';
import { logger } from '../../utils/logger';

interface OrchestratorInput {
  complaintId: string;
  title: string;
  description: string;
  category: string;
  latitude: number;
  longitude: number;
  imageUrls: string[];
  ward?: string;
  district?: string;
  isCriticalKeyword: boolean;
}

export class ComplaintAgentOrchestrator {
  /**
   * Run the full analysis pipeline for a new complaint.
   */
  static async analyzeComplaint(input: OrchestratorInput): Promise<ComplaintAnalysis> {
    const start = Date.now();
    const agentsRun: string[] = [];
    const agentsSkipped: string[] = [];

    logger.info(`[Orchestrator] Starting analysis for complaint ${input.complaintId}`);

    // ── Stage 1: Vision ──────────────────────────────────
    const vision = await this.runAgent('vision', () =>
      VisionAgent.run({
        imageUrls: input.imageUrls,
        existingCategory: input.category,
        description: input.description,
      }),
      input.complaintId,
      agentsRun,
      agentsSkipped,
    );

    // ── Stage 2: Duplicate Detection ─────────────────────
    const duplicate = await this.runAgent('duplicate', () =>
      DuplicateAgent.run({
        complaintId: input.complaintId,
        title: input.title,
        description: input.description,
        category: input.category,
        latitude: input.latitude,
        longitude: input.longitude,
      }),
      input.complaintId,
      agentsRun,
      agentsSkipped,
    );

    // ── Stage 3: Priority Assessment ─────────────────────
    const priority = await this.runAgent('priority', () =>
      PriorityAgent.run({
        title: input.title,
        description: input.description,
        category: input.category,
        latitude: input.latitude,
        longitude: input.longitude,
        duplicateCount: duplicate?.data?.candidates?.length || 0,
        hasMedia: input.imageUrls.length > 0,
        isCriticalKeyword: input.isCriticalKeyword,
      }),
      input.complaintId,
      agentsRun,
      agentsSkipped,
    );

    // ── Stage 4: Routing ─────────────────────────────────
    const routing = await this.runAgent('routing', () =>
      RoutingAgent.run({
        title: input.title,
        description: input.description,
        category: input.category,
        ward: input.ward,
        district: input.district,
      }),
      input.complaintId,
      agentsRun,
      agentsSkipped,
    );

    // ── Stage 5: Persist AI Analysis ─────────────────────
    const analysis: ComplaintAnalysis = {
      complaintId: input.complaintId,
      vision,
      duplicate,
      priority,
      routing,
      orchestratorMeta: {
        totalExecutionTimeMs: Date.now() - start,
        agentsRun,
        agentsSkipped,
        timestamp: new Date(),
      },
    };

    await this.persistAnalysis(analysis);

    // ── Stage 6: Apply AI suggestions to complaint ───────
    await this.applyToComplaint(analysis);

    logger.info(`[Orchestrator] Analysis complete for ${input.complaintId} in ${Date.now() - start}ms (${agentsRun.length} agents)`);

    return analysis;
  }

  /**
   * Run the verification pipeline for resolution evidence.
   */
  static async verifyResolution(
    complaintId: string,
    complaintTitle: string,
    complaintDescription: string,
    complaintCategory: string,
    resolutionDescription: string,
    beforeImageUrls: string[],
    afterImageUrls: string[],
  ): Promise<AgentResult<VerificationAnalysis>> {
    const result = await VerificationAgent.run({
      complaintTitle,
      complaintDescription,
      complaintCategory,
      resolutionDescription,
      beforeImageUrls,
      afterImageUrls,
    });

    // Log the decision
    await AgentDecision.create({
      complaintId,
      agentName: VerificationAgent.AGENT_NAME,
      llmModel: result.meta.model,
      input: { complaintTitle, resolutionDescription, beforeCount: beforeImageUrls.length, afterCount: afterImageUrls.length },
      output: result.data,
      confidence: result.meta.confidence,
      executionTimeMs: result.meta.executionTimeMs,
      isMock: result.meta.isMock,
      error: result.error,
    });

    return result;
  }

  /**
   * Generate CM executive briefing.
   */
  static async generateBriefing(): Promise<AgentResult<AdvisorBriefing>> {
    return AdvisorAgent.run();
  }

  // ── Private helpers ───────────────────────────────────

  private static async runAgent<T>(
    name: string,
    fn: () => Promise<AgentResult<T>>,
    complaintId: string,
    agentsRun: string[],
    agentsSkipped: string[],
  ): Promise<AgentResult<T>> {
    try {
      const result = await fn();

      if (result.meta.model === 'skipped') {
        agentsSkipped.push(name);
      } else {
        agentsRun.push(name);
      }

      // Log decision
      await AgentDecision.create({
        complaintId,
        agentName: name,
        llmModel: result.meta.model,
        input: { complaintId },
        output: result.data as Record<string, unknown>,
        confidence: result.meta.confidence,
        executionTimeMs: result.meta.executionTimeMs,
        isMock: result.meta.isMock,
        error: result.error,
      }).catch(err => logger.warn(`[Orchestrator] Failed to log ${name} decision: ${err.message}`));

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`[Orchestrator] Agent ${name} threw: ${message}`);
      agentsSkipped.push(name);

      return {
        success: false,
        data: {} as T,
        meta: {
          agentName: name,
          model: 'error',
          executionTimeMs: 0,
          timestamp: new Date(),
          confidence: 0,
          isMock: false,
        },
        error: message,
      };
    }
  }

  private static async persistAnalysis(analysis: ComplaintAnalysis): Promise<void> {
    try {
      const providerName = analysis.vision?.meta?.model || analysis.priority?.meta?.model || 'unknown';
      const isMock = providerName.includes('mock');
      const confidences = [
        analysis.vision?.meta?.confidence,
        analysis.duplicate?.meta?.confidence,
        analysis.priority?.meta?.confidence,
        analysis.routing?.meta?.confidence,
      ].filter((c): c is number => c !== undefined && c > 0);

      const overallConfidence = confidences.length > 0
        ? confidences.reduce((a, b) => a + b, 0) / confidences.length
        : 0;

      await AIAnalysis.findOneAndUpdate(
        { complaintId: analysis.complaintId },
        {
          complaintId: analysis.complaintId,
          vision: analysis.vision?.success ? {
            detectedCategory: analysis.vision.data.detectedCategory,
            severity: analysis.vision.data.severity,
            confidence: analysis.vision.data.confidence,
            reason: analysis.vision.data.reason,
            visibleHazards: analysis.vision.data.visibleHazards,
            suggestedTags: analysis.vision.data.suggestedTags,
          } : undefined,
          duplicate: analysis.duplicate?.success ? {
            isDuplicate: analysis.duplicate.data.isDuplicate,
            masterTicketId: analysis.duplicate.data.masterTicketId,
            reasoning: analysis.duplicate.data.reasoning,
            candidateCount: analysis.duplicate.data.candidates.length,
          } : undefined,
          priority: analysis.priority?.success ? {
            score: analysis.priority.data.score,
            level: analysis.priority.data.level,
            suggestedSlaHours: analysis.priority.data.suggestedSlaHours,
            reasoning: analysis.priority.data.reasoning,
          } : undefined,
          routing: analysis.routing?.success ? {
            primaryDepartmentCode: analysis.routing.data.primaryDepartment.departmentCode,
            primaryDepartmentName: analysis.routing.data.primaryDepartment.departmentName,
            confidence: analysis.routing.data.primaryDepartment.confidence,
            reasoning: analysis.routing.data.reasoning,
            secondaryDepartments: analysis.routing.data.secondaryDepartments.map(d => d.departmentCode),
          } : undefined,
          overallConfidence,
          provider: providerName,
          isMock,
          executionTimeMs: analysis.orchestratorMeta.totalExecutionTimeMs,
        },
        { upsert: true, new: true },
      );
    } catch (error) {
      logger.error(`[Orchestrator] Failed to persist analysis: ${error}`);
    }
  }

  private static async applyToComplaint(analysis: ComplaintAnalysis): Promise<void> {
    try {
      const complaint = await Complaint.findById(analysis.complaintId);
      if (!complaint) return;

      let modified = false;

      // Apply priority if the agent provided a higher urgency
      if (analysis.priority?.success && analysis.priority.data.score > 0) {
        const level = analysis.priority.data.level;
        const priorityMap: Record<string, ComplaintPriority> = {
          low: ComplaintPriority.LOW,
          normal: ComplaintPriority.NORMAL,
          high: ComplaintPriority.HIGH,
          critical: ComplaintPriority.CRITICAL,
        };
        const newPriority = priorityMap[level] || ComplaintPriority.NORMAL;

        // Only upgrade priority, never downgrade
        const priorityRank = { low: 0, normal: 1, high: 2, critical: 3 };
        if (priorityRank[newPriority] > priorityRank[complaint.priority]) {
          complaint.priority = newPriority;
          modified = true;
        }

        // Update SLA if agent suggests shorter window
        if (analysis.priority.data.suggestedSlaHours > 0) {
          const suggestedDeadline = new Date(Date.now() + analysis.priority.data.suggestedSlaHours * 3600000);
          if (!complaint.sla.deadline || suggestedDeadline < complaint.sla.deadline) {
            complaint.sla.deadline = suggestedDeadline;
            modified = true;
          }
        }
      }

      // Apply routing suggestion if no department assigned yet
      if (analysis.routing?.success && !complaint.assignedDepartment) {
        const deptCode = analysis.routing.data.primaryDepartment.departmentCode;
        const dept = await Department.findOne({ code: deptCode, isActive: true });
        if (dept) {
          complaint.assignedDepartment = dept._id as any;
          modified = true;
        }
      }

      // Apply vision-suggested tags
      if (analysis.vision?.success && analysis.vision.data.suggestedTags.length > 0) {
        const existingTags = new Set(complaint.tags);
        for (const tag of analysis.vision.data.suggestedTags) {
          existingTags.add(tag);
        }
        complaint.tags = Array.from(existingTags);
        modified = true;
      }

      if (modified) {
        await complaint.save();
        logger.info(`[Orchestrator] Applied AI suggestions to complaint ${analysis.complaintId}`);
      }
    } catch (error) {
      logger.error(`[Orchestrator] Failed to apply analysis to complaint: ${error}`);
    }
  }
}
