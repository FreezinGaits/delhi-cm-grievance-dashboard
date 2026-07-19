/**
 * CM Advisor Agent — generates executive intelligence briefings.
 *
 * Queries actual database state (complaints, SLA breaches, officer scores,
 * clusters) and synthesises an actionable briefing for the Chief Minister.
 *
 * Never hallucinates — all data comes from MongoDB queries.
 */

import { getLLMProvider } from '../shared/llm-provider';
import { AgentResult, AdvisorBriefing, AgentMeta } from '../shared/types';
import { logger } from '../../utils/logger';
import { env } from '../../config/env';
import { Complaint, ComplaintStatus } from '../../models/Complaint';
import { OfficerScore } from '../../models/OfficerScore';
import { ComplaintCluster } from '../../models/ComplaintCluster';

export class AdvisorAgent {
  static readonly AGENT_NAME = 'advisor';

  static async run(): Promise<AgentResult<AdvisorBriefing>> {
    const start = Date.now();

    if (!env.ENABLE_CM_ADVISOR) {
      return this.buildSkippedResult(start);
    }

    try {
      // ── Gather real data from MongoDB ────────────────────
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 3600000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600000);

      const [
        totalActive,
        newToday,
        criticalOpen,
        slaBreached,
        recentComplaints,
        lowScoringOfficers,
        activeClusters,
      ] = await Promise.all([
        Complaint.countDocuments({
          isDeleted: false,
          status: { $nin: [ComplaintStatus.CLOSED, ComplaintStatus.RESOLVED] },
        }),
        Complaint.countDocuments({
          isDeleted: false,
          createdAt: { $gte: oneDayAgo },
        }),
        Complaint.countDocuments({
          isDeleted: false,
          isCritical: true,
          status: { $nin: [ComplaintStatus.CLOSED, ComplaintStatus.RESOLVED] },
        }),
        Complaint.countDocuments({
          isDeleted: false,
          'sla.breached': true,
          status: { $nin: [ComplaintStatus.CLOSED, ComplaintStatus.RESOLVED] },
        }),
        Complaint.find({
          isDeleted: false,
          isCritical: true,
          status: { $nin: [ComplaintStatus.CLOSED, ComplaintStatus.RESOLVED] },
        })
          .populate('assignedDepartment', 'name code')
          .select('referenceNumber title category address.ward priority')
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),
        OfficerScore.find({
          overallScore: { $lt: 40 },
          'period.type': 'weekly',
          'period.endDate': { $gte: sevenDaysAgo },
        })
          .populate('officerId', 'name email')
          .sort({ overallScore: 1 })
          .limit(5)
          .lean(),
        ComplaintCluster.find({ status: 'active' })
          .select('category location complaintCount')
          .sort({ complaintCount: -1 })
          .limit(5)
          .lean(),
      ]);

      // ── Build context for the LLM ───────────────────────
      const dataContext = {
        totalActive,
        newToday,
        criticalOpen,
        slaBreached,
        urgentComplaints: recentComplaints.map(c => ({
          ref: c.referenceNumber,
          title: c.title,
          category: c.category,
          ward: c.address?.ward || 'Unknown',
          dept: ((c.assignedDepartment as unknown) as { name?: string })?.name || 'Unassigned',
        })),
        lowPerformingOfficers: lowScoringOfficers.map(s => ({
          name: ((s.officerId as unknown) as { name?: string })?.name || 'Unknown',
          score: s.overallScore || 0,
        })),
        hotClusters: activeClusters.map(cl => ({
          category: cl.category,
          count: cl.complaintCount,
        })),
      };

      const provider = getLLMProvider();

      const result = await provider.complete({
        systemPrompt: `You are the Chief Minister's executive intelligence advisor for Delhi.
Generate a morning briefing based ONLY on the data provided. Never invent data.

Respond ONLY in valid JSON matching this structure:
{
  "summary": "2-3 sentence executive summary",
  "urgentIncidents": [{ "complaintId": "", "referenceNumber": "", "title": "", "reason": "", "suggestedAction": "" }],
  "departmentAlerts": [{ "departmentName": "", "metric": "", "value": 0, "threshold": 0, "recommendation": "" }],
  "officerFlags": [{ "officerName": "", "issue": "", "recommendation": "" }],
  "predictedHotspots": [{ "area": "", "riskType": "", "riskLevel": "moderate|high|critical", "reasoning": "" }],
  "suggestedActions": ["action1", "action2"]
}`,
        userPrompt: `CURRENT SYSTEM STATE:
${JSON.stringify(dataContext, null, 2)}

Generate the executive briefing based on this actual data.`,
        responseFormat: 'json',
      });

      const parsed = JSON.parse(result.content);
      const briefing: AdvisorBriefing = {
        generatedAt: new Date(),
        summary: parsed.summary || `${totalActive} active complaints, ${criticalOpen} critical, ${slaBreached} SLA breaches.`,
        urgentIncidents: parsed.urgentIncidents || [],
        departmentAlerts: parsed.departmentAlerts || [],
        officerFlags: parsed.officerFlags || [],
        predictedHotspots: parsed.predictedHotspots || [],
        suggestedActions: parsed.suggestedActions || [],
      };

      logger.info(`[AdvisorAgent] Briefing generated: ${briefing.urgentIncidents.length} urgent, ${briefing.suggestedActions.length} actions`);

      return {
        success: true,
        data: briefing,
        meta: this.buildMeta(start, 0.85, result.model),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`[AdvisorAgent] Error: ${message}`);
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

  private static buildSkippedResult(start: number): AgentResult<AdvisorBriefing> {
    return {
      success: true,
      data: {
        generatedAt: new Date(),
        summary: 'CM Advisor agent is disabled.',
        urgentIncidents: [],
        departmentAlerts: [],
        officerFlags: [],
        predictedHotspots: [],
        suggestedActions: [],
      },
      meta: this.buildMeta(start, 0, 'skipped'),
    };
  }

  private static buildErrorResult(start: number, error: string): AgentResult<AdvisorBriefing> {
    return {
      success: false,
      data: {
        generatedAt: new Date(),
        summary: 'Advisor briefing generation failed.',
        urgentIncidents: [],
        departmentAlerts: [],
        officerFlags: [],
        predictedHotspots: [],
        suggestedActions: [],
      },
      meta: this.buildMeta(start, 0, 'error'),
      error,
    };
  }
}
