export { User, UserRole, NotificationChannel } from './User';
export type { IUser } from './User';

export { Department } from './Department';
export type { IDepartment, IRoutingRule } from './Department';

export { Complaint, ComplaintStatus, ComplaintPriority, ComplaintSource } from './Complaint';
export type { IComplaint } from './Complaint';

export { ComplaintHistory, HistoryAction } from './ComplaintHistory';
export type { IComplaintHistory } from './ComplaintHistory';

export { ComplaintCluster } from './ComplaintCluster';
export type { IComplaintCluster } from './ComplaintCluster';

export { AuditLog } from './AuditLog';
export type { IAuditLog } from './AuditLog';

export { Notification } from './Notification';
export type { INotification } from './Notification';

export { Assignment } from './Assignment';
export type { IAssignment } from './Assignment';

export { VisitLog } from './VisitLog';
export type { IVisitLog } from './VisitLog';

export { OfficerMetrics } from './OfficerMetrics';
export type { IOfficerMetrics } from './OfficerMetrics';

export { DepartmentMetrics } from './DepartmentMetrics';
export type { IDepartmentMetrics } from './DepartmentMetrics';

// ── Phase A: WhatsApp Intake ──
export { WhatsAppSession, ConversationState } from './WhatsAppSession';
export type { IWhatsAppSession } from './WhatsAppSession';

export { WhatsAppMessage, MessageDirection, WAMessageType } from './WhatsAppMessage';
export type { IWhatsAppMessage } from './WhatsAppMessage';

// ── Phase C: Accountability Engine ──
export { OfficerScore, PerformanceCategory } from './OfficerScore';
export type { IOfficerScore } from './OfficerScore';

// ── Phase D: CM Spot Directives ──
export { Directive, DirectiveStatus, DirectivePriority } from './Directive';
export type { IDirective } from './Directive';

// ── Phase E: Agentic AI Governance ──
export { AIAnalysis } from './AIAnalysis';
export type { IAIAnalysis } from './AIAnalysis';

export { AgentDecision } from './AgentDecision';
export type { IAgentDecision } from './AgentDecision';
