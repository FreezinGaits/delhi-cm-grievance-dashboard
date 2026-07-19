'use client';

import { useState, useEffect } from 'react';

interface AdvisorBriefing {
  generatedAt: string;
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
    riskLevel: string;
    reasoning: string;
  }>;
  suggestedActions: string[];
}

export default function AIBriefingWidget() {
  const [briefing, setBriefing] = useState<AdvisorBriefing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isMock, setIsMock] = useState(true);

  const fetchBriefing = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/agents/advisor`, {
        headers: { 'Authorization': `Bearer ${token || ''}` },
      });
      const data = await res.json();
      if (data.success) {
        setBriefing(data.data?.data || data.data);
        setIsMock(data.data?.meta?.isMock ?? true);
      } else {
        throw new Error(data.error?.message || 'Failed to generate briefing');
      }
    } catch (err: any) {
      setError(err.message || 'AI Advisor unavailable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBriefing();
  }, []);

  const riskLevelColor: Record<string, string> = {
    moderate: '#f59e0b',
    high: '#ef4444',
    critical: '#dc2626',
  };

  return (
    <div className="glass-card" style={{ padding: '24px', marginBottom: '24px', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px',
          }}>🧠</span>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>AI Executive Briefing</h3>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {isMock && <span style={{ color: '#8b5cf6', marginRight: '6px' }}>● MOCK MODE</span>}
              {briefing?.generatedAt ? `Generated: ${new Date(briefing.generatedAt).toLocaleTimeString('en-IN')}` : 'Not yet generated'}
            </span>
          </div>
        </div>
        <button onClick={fetchBriefing} disabled={loading} className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
          {loading ? '⟳ Generating...' : '⟳ Refresh'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#fca5a5', fontSize: '0.8rem', marginBottom: '12px' }}>
          {error}
        </div>
      )}

      {loading && !briefing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="skeleton" style={{ height: '60px' }} />
          <div className="skeleton" style={{ height: '100px' }} />
        </div>
      )}

      {briefing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Summary */}
          <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.06)', border: '1px solid rgba(139, 92, 246, 0.12)', fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
            {briefing.summary}
          </div>

          {/* Urgent Incidents */}
          {briefing.urgentIncidents?.length > 0 && (
            <div>
              <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fca5a5', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ▲ Urgent Incidents ({briefing.urgentIncidents.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {briefing.urgentIncidents.map((inc, i) => (
                  <div key={i} style={{ padding: '12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.12)', fontSize: '0.8rem' }}>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text-muted)', marginRight: '8px' }}>{inc.referenceNumber}</span>
                      {inc.title}
                    </div>
                    <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>{inc.reason}</div>
                    <div style={{ color: '#8b5cf6', fontStyle: 'italic' }}>→ {inc.suggestedAction}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Department Alerts */}
          {briefing.departmentAlerts?.length > 0 && (
            <div>
              <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fbbf24', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ▤ Department Alerts
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {briefing.departmentAlerts.map((alert, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.12)', fontSize: '0.8rem' }}>
                    <div>
                      <span style={{ fontWeight: 600 }}>{alert.departmentName}</span>
                      <span style={{ color: 'var(--text-muted)', margin: '0 8px' }}>•</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{alert.metric}: {alert.value}% (threshold: {alert.threshold}%)</span>
                    </div>
                    <span style={{ color: '#8b5cf6', fontSize: '0.75rem', fontStyle: 'italic' }}>{alert.recommendation}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Predicted Hotspots */}
          {briefing.predictedHotspots?.length > 0 && (
            <div>
              <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ◎ Predicted Hotspots
              </h4>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {briefing.predictedHotspots.map((hs, i) => (
                  <div key={i} style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.12)', fontSize: '0.8rem', flex: '1 1 200px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600 }}>{hs.area}</span>
                      <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: `${riskLevelColor[hs.riskLevel] || '#f59e0b'}20`, color: riskLevelColor[hs.riskLevel] || '#f59e0b', fontWeight: 700 }}>
                        {hs.riskLevel.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{hs.riskType} — {hs.reasoning}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Actions */}
          {briefing.suggestedActions?.length > 0 && (
            <div>
              <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6ee7b7', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ✓ AI Recommended Actions
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {briefing.suggestedActions.map((action, i) => (
                  <div key={i} style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.1)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <span style={{ color: '#6ee7b7', marginRight: '8px', fontWeight: 700 }}>{i + 1}.</span>
                    {action}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
