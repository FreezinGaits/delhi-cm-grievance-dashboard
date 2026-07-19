import mongoose, { Schema, Document } from 'mongoose';

/**
 * AgentDecision — granular log of every individual agent execution.
 * Multiple entries per complaint (one per agent invocation).
 */

export interface IAgentDecision extends Document {
  complaintId: mongoose.Types.ObjectId;
  agentName: string;
  llmModel: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  confidence: number;
  executionTimeMs: number;
  isMock: boolean;
  error?: string;
  createdAt: Date;
}

const AgentDecisionSchema = new Schema<IAgentDecision>(
  {
    complaintId: {
      type: Schema.Types.ObjectId,
      ref: 'Complaint',
      required: true,
    },
    agentName: { type: String, required: true },
    llmModel: { type: String, required: true },
    input: { type: Schema.Types.Mixed, default: {} },
    output: { type: Schema.Types.Mixed, default: {} },
    confidence: { type: Number, default: 0 },
    executionTimeMs: { type: Number, default: 0 },
    isMock: { type: Boolean, default: true },
    error: String,
  },
  { timestamps: true },
);

AgentDecisionSchema.index({ complaintId: 1, agentName: 1 });
AgentDecisionSchema.index({ agentName: 1, createdAt: -1 });
AgentDecisionSchema.index({ createdAt: -1 });

export const AgentDecision = mongoose.model<IAgentDecision>('AgentDecision', AgentDecisionSchema);
