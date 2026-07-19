'use client';

/**
 * AIAnalysisBadge — shows AI analysis results inline on complaint cards.
 * Used in Citizen Dashboard and Officer Dashboard.
 */

interface AIBadgeProps {
  analysis: {
    vision?: { detectedCategory: string; severity: string; confidence: number };
    priority?: { score: number; level: string; suggestedSlaHours: number; reasoning: string };
    routing?: { primaryDepartmentCode: string; primaryDepartmentName: string; confidence: number };
    overallConfidence: number;
    isMock: boolean;
    provider: string;
  } | null;
  compact?: boolean;
}

const severityColors: Record<string, string> = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444',
  critical: '#dc2626',
};

const priorityColors: Record<string, string> = {
  low: '#10b981',
  normal: '#3b82f6',
  high: '#f59e0b',
  critical: '#ef4444',
};

export default function AIAnalysisBadge({ analysis, compact = false }: AIBadgeProps) {
  if (!analysis) return null;

  if (compact) {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        padding: '3px 8px', borderRadius: '6px',
        background: 'rgba(139, 92, 246, 0.08)',
        border: '1px solid rgba(139, 92, 246, 0.15)',
        fontSize: '0.7rem',
      }}>
        <span style={{ color: '#8b5cf6', fontWeight: 700 }}>🧠 AI</span>
        {analysis.priority && (
          <span style={{ color: priorityColors[analysis.priority.level] || '#3b82f6', fontWeight: 600 }}>
            P{analysis.priority.score}
          </span>
        )}
        {analysis.vision && (
          <span style={{ color: severityColors[analysis.vision.severity] || '#f59e0b' }}>
            {analysis.vision.detectedCategory}
          </span>
        )}
        {analysis.isMock && <span style={{ color: 'var(--text-muted)' }}>mock</span>}
      </div>
    );
  }

  return (
    <div style={{
      padding: '12px 16px', borderRadius: '10px',
      background: 'rgba(139, 92, 246, 0.04)',
      border: '1px solid rgba(139, 92, 246, 0.12)',
      marginTop: '8px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '4px' }}>
          🧠 AI Analysis
        </span>
        <span style={{
          fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px',
          background: analysis.isMock ? 'rgba(139, 92, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
          color: analysis.isMock ? '#8b5cf6' : '#10b981',
        }}>
          {analysis.isMock ? 'MOCK' : analysis.provider}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '0.8rem' }}>
        {analysis.vision && (
          <div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Detected: </span>
            <span style={{ fontWeight: 600 }}>{analysis.vision.detectedCategory}</span>
            <span style={{
              marginLeft: '6px', padding: '1px 5px', borderRadius: '3px', fontSize: '0.65rem', fontWeight: 700,
              background: `${severityColors[analysis.vision.severity] || '#f59e0b'}15`,
              color: severityColors[analysis.vision.severity] || '#f59e0b',
            }}>
              {analysis.vision.severity.toUpperCase()}
            </span>
          </div>
        )}

        {analysis.priority && (
          <div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Priority: </span>
            <span style={{ fontWeight: 700, color: priorityColors[analysis.priority.level] || '#3b82f6' }}>
              {analysis.priority.score}/100
            </span>
            <span style={{ color: 'var(--text-muted)', marginLeft: '4px', fontSize: '0.7rem' }}>
              SLA: {analysis.priority.suggestedSlaHours}h
            </span>
          </div>
        )}

        {analysis.routing && (
          <div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Dept: </span>
            <span style={{ fontWeight: 600 }}>{analysis.routing.primaryDepartmentCode}</span>
            <span style={{ color: 'var(--text-muted)', marginLeft: '4px', fontSize: '0.7rem' }}>
              ({Math.round(analysis.routing.confidence * 100)}%)
            </span>
          </div>
        )}
      </div>

      {analysis.priority?.reasoning && (
        <div style={{ marginTop: '6px', fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          {analysis.priority.reasoning}
        </div>
      )}
    </div>
  );
}
