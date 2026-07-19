/**
 * Routing Agent — AI-powered department routing.
 *
 * Upgrades the current rule-based category→department mapping.
 * Can suggest multiple departments for cross-cutting issues.
 */

import { getLLMProvider } from '../shared/llm-provider';
import { AgentResult, RoutingAnalysis, AgentMeta } from '../shared/types';
import { logger } from '../../utils/logger';
import { env } from '../../config/env';
import { Department } from '../../models/Department';

interface RoutingInput {
  title: string;
  description: string;
  category: string;
  ward?: string;
  district?: string;
}

export class RoutingAgent {
  static readonly AGENT_NAME = 'routing';

  static async run(input: RoutingInput): Promise<AgentResult<RoutingAnalysis>> {
    const start = Date.now();

    if (!env.ENABLE_ROUTING_AGENT) {
      return this.buildSkippedResult(start);
    }

    try {
      // Fetch available departments for context
      const departments = await Department.find({ isActive: true })
        .select('name code description categories')
        .lean();

      const deptList = departments.map(d =>
        `- ${d.code}: ${d.name} (handles: ${(d.categories || []).join(', ') || 'general'})`
      ).join('\n');

      const provider = getLLMProvider();

      const result = await provider.complete({
        systemPrompt: `You are a civic complaint routing agent for the Delhi government.
Given a complaint and the list of available departments, determine which department(s) should handle it.
Some complaints span multiple departments (e.g., water leak damaging road = DJB + PWD).

Respond ONLY in valid JSON:
{
  "primaryDepartment": { "departmentCode": "CODE", "departmentName": "Name", "confidence": 0-1, "reason": "..." },
  "secondaryDepartments": [{ "departmentCode": "CODE", "departmentName": "Name", "confidence": 0-1, "reason": "..." }],
  "escalationLevel": 0-3,
  "reasoning": "explanation"
}`,
        userPrompt: `COMPLAINT:
Title: "${input.title}"
Description: "${input.description}"
Category: ${input.category}
Ward: ${input.ward || 'Unknown'}
District: ${input.district || 'Unknown'}

AVAILABLE DEPARTMENTS:
${deptList}`,
        responseFormat: 'json',
      });

      const parsed = JSON.parse(result.content) as RoutingAnalysis;
      const confidence = parsed.primaryDepartment?.confidence || 0.5;

      logger.info(`[RoutingAgent] Primary: ${parsed.primaryDepartment?.departmentCode}, secondary: ${parsed.secondaryDepartments?.length || 0}`);

      return {
        success: true,
        data: parsed,
        meta: this.buildMeta(start, confidence, result.model),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`[RoutingAgent] Error: ${message}`);
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

  private static buildSkippedResult(start: number): AgentResult<RoutingAnalysis> {
    return {
      success: true,
      data: {
        primaryDepartment: {
          departmentCode: 'GENERAL',
          departmentName: 'General Administration',
          confidence: 0,
          reason: 'Routing agent disabled — using rule-based fallback',
        },
        secondaryDepartments: [],
        escalationLevel: 0,
        reasoning: 'Routing agent disabled',
      },
      meta: this.buildMeta(start, 0, 'skipped'),
    };
  }

  private static buildErrorResult(start: number, error: string): AgentResult<RoutingAnalysis> {
    return {
      success: false,
      data: {
        primaryDepartment: {
          departmentCode: 'GENERAL',
          departmentName: 'General Administration',
          confidence: 0,
          reason: 'Routing analysis failed — using rule-based fallback',
        },
        secondaryDepartments: [],
        escalationLevel: 0,
        reasoning: 'Routing analysis failed',
      },
      meta: this.buildMeta(start, 0, 'error'),
      error,
    };
  }
}
