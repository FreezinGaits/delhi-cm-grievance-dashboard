'use client';

import { useState, useEffect, useCallback } from 'react';

interface OfficerRanking {
  _id: string;
  officerId?: { _id: string; name?: string; email?: string; phone?: string; ward?: string };
  departmentId?: { _id: string; name?: string; code?: string };
  overallScore: number;
  category: string;
  globalRank: number;
  departmentRank: number;
  totalComplaintsHandled: number;
  trend: number;
  metrics: {
    resolutionRate: number;
    citizenSatisfaction: number;
    avgResolutionTimeHours: number;
    slaCompliance: number;
    escalationCount: number;
    rejectedResolutions: number;
    criticalCasePerformance: number;
  };
  period: { type: string; startDate: string; endDate: string };
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const categoryConfig: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  excellent: { label: 'Excellent', color: '#6ee7b7', bg: 'rgba(16, 185, 129, 0.12)', emoji: '🟢' },
  good: { label: 'Good', color: '#93c5fd', bg: 'rgba(59, 130, 246, 0.12)', emoji: '🔵' },
  needs_attention: { label: 'Needs Attention', color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.12)', emoji: '🟡' },
  critical: { label: 'Critical', color: '#fca5a5', bg: 'rgba(239, 68, 68, 0.12)', emoji: '🔴' },
};

export default function RankingsPage() {
  const [rankings, setRankings] = useState<OfficerRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'quarterly'>('weekly');
  const [sortBy, setSortBy] = useState<'top' | 'bottom'>('top');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [computing, setComputing] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
  const headers = { 'Authorization': `Bearer ${token || ''}`, 'Content-Type': 'application/json' };

  const fetchRankings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${API_BASE}/api/v1/governance/officer-rankings?period=${period}&sortBy=${sortBy}&limit=50`,
        { headers },
      );
      const data = await res.json();
      if (data.success) setRankings(data.data || []);
    } catch (err) {
      console.error('Failed to fetch rankings:', err);
    } finally {
      setLoading(false);
    }
  }, [period, sortBy]);

  useEffect(() => { fetchRankings(); }, [fetchRankings]);

  const triggerCompute = async () => {
    setComputing(true);
    try {
      await fetch(`${API_BASE}/api/v1/governance/compute-scores`, {
        method: 'POST', headers,
        body: JSON.stringify({ period }),
      });
      await fetchRankings();
    } catch (err) {
      console.error('Failed to compute scores:', err);
    } finally {
      setComputing(false);
    }
  };

  const ScoreBar = ({ value, label, color }: { value: number; label: string; color: string }) => (
    <div style={{ marginBottom: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontWeight: 700, color }}>{value.toFixed(1)}%</span>
      </div>
      <div style={{ height: '6px', borderRadius: '3px', background: 'var(--bg-secondary)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(value, 100)}%`, borderRadius: '3px', background: color, transition: 'width 0.8s ease' }} />
      </div>
    </div>
  );

  // Summary stats from rankings
  const avgScore = rankings.length > 0 ? rankings.reduce((s, r) => s + r.overallScore, 0) / rankings.length : 0;
  const excellent = rankings.filter(r => r.category === 'excellent').length;
  const critical = rankings.filter(r => r.category === 'critical').length;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '4px' }}>🏅 Officer Accountability Rankings</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Weighted performance scores across 7 metrics</p>
        </div>
        <button onClick={triggerCompute} className="btn btn-primary" disabled={computing}>
          {computing ? '⏳ Computing...' : '🔄 Recompute Scores'}
        </button>
      </div>

      {/* Summary Row */}
      <div className="stagger-children" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <div className="stat-card" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Officers Scored</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{rankings.length}</div>
        </div>
        <div className="stat-card success" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Avg Score</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#6ee7b7' }}>{avgScore.toFixed(1)}</div>
        </div>
        <div className="stat-card" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>🟢 Excellent</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#6ee7b7' }}>{excellent}</div>
        </div>
        <div className="stat-card critical" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>🔴 Critical</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fca5a5' }}>{critical}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['weekly', 'monthly', 'quarterly'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={period === p ? 'btn btn-primary' : 'btn btn-ghost'}
              style={{ padding: '6px 14px', fontSize: '0.8rem', textTransform: 'capitalize' }}>
              {p}
            </button>
          ))}
        </div>
        <div style={{ width: '1px', height: '24px', background: 'var(--border-color)' }} />
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={() => setSortBy('top')}
            className={sortBy === 'top' ? 'btn btn-primary' : 'btn btn-ghost'}
            style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
            🏆 Top Performers
          </button>
          <button onClick={() => setSortBy('bottom')}
            className={sortBy === 'bottom' ? 'btn btn-primary' : 'btn btn-ghost'}
            style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
            ⚠️ Needs Attention
          </button>
        </div>
      </div>

      {/* Rankings Table */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[1,2,3,4,5].map(i => <div key={i} style={{ height: '72px' }} className="skeleton" />)}
        </div>
      ) : rankings.length === 0 ? (
        <div className="glass-card" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🏅</div>
          <p style={{ marginBottom: '12px' }}>No officer scores computed yet.</p>
          <button onClick={triggerCompute} className="btn btn-primary">Compute Now</button>
        </div>
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                {['#', 'Officer', 'Department', 'Score', 'Category', 'Trend', 'Cases', ''].map(h => (
                  <th key={h} style={{ padding: '14px 12px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rankings.map((r) => {
                const cat = categoryConfig[r.category] || categoryConfig.good;
                const isExpanded = expanded === r._id;
                return (
                  <>
                    <tr key={r._id} style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background 0.15s' }}
                      onClick={() => setExpanded(isExpanded ? null : r._id)}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: '14px 12px', fontWeight: 800, fontSize: '1rem', color: r.globalRank <= 3 ? '#fbbf24' : 'var(--text-primary)' }}>
                        {r.globalRank <= 3 ? ['🥇', '🥈', '🥉'][r.globalRank - 1] : `#${r.globalRank}`}
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ fontWeight: 600 }}>{r.officerId?.name || 'Unknown'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.officerId?.email || ''}</div>
                      </td>
                      <td style={{ padding: '14px 12px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {r.departmentId?.name || r.departmentId?.code || 'N/A'}
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: `conic-gradient(${cat.color} ${r.overallScore * 3.6}deg, var(--bg-secondary) 0deg)`,
                            fontSize: '0.85rem', fontWeight: 800, position: 'relative',
                          }}>
                            <div style={{
                              width: '38px', height: '38px', borderRadius: '50%', background: 'var(--bg-card)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {r.overallScore}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, color: cat.color, background: cat.bg }}>
                          {cat.emoji} {cat.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <span style={{ fontWeight: 700, color: r.trend > 0 ? '#6ee7b7' : r.trend < 0 ? '#fca5a5' : 'var(--text-muted)' }}>
                          {r.trend > 0 ? `↑+${r.trend}` : r.trend < 0 ? `↓${r.trend}` : '—'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 12px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        {r.totalComplaintsHandled}
                      </td>
                      <td style={{ padding: '14px 12px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {isExpanded ? '▲' : '▼'}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${r._id}-detail`}>
                        <td colSpan={8} style={{ padding: '0 12px 16px 12px', background: 'var(--bg-card)' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '16px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                            <div>
                              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px', color: 'var(--text-secondary)' }}>Performance Breakdown</h4>
                              <ScoreBar value={r.metrics.resolutionRate} label="Resolution Rate (25%)" color="#6ee7b7" />
                              <ScoreBar value={r.metrics.citizenSatisfaction} label="Citizen Satisfaction (20%)" color="#93c5fd" />
                              <ScoreBar value={r.metrics.slaCompliance} label="SLA Compliance (20%)" color="#c4b5fd" />
                              <ScoreBar value={Math.max(0, 100 - (r.metrics.avgResolutionTimeHours / 168) * 100)} label="Resolution Speed (15%)" color="#fbbf24" />
                              <ScoreBar value={r.metrics.criticalCasePerformance} label="Critical Cases (5%)" color="#f472b6" />
                            </div>
                            <div>
                              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px', color: 'var(--text-secondary)' }}>Details</h4>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem' }}>
                                <div style={{ padding: '10px', borderRadius: '8px', background: 'var(--bg-card)' }}>
                                  <div style={{ color: 'var(--text-muted)', marginBottom: '2px' }}>Avg Resolution</div>
                                  <div style={{ fontWeight: 700 }}>{r.metrics.avgResolutionTimeHours.toFixed(1)}h</div>
                                </div>
                                <div style={{ padding: '10px', borderRadius: '8px', background: 'var(--bg-card)' }}>
                                  <div style={{ color: 'var(--text-muted)', marginBottom: '2px' }}>Escalations</div>
                                  <div style={{ fontWeight: 700, color: r.metrics.escalationCount > 5 ? '#fca5a5' : 'inherit' }}>{r.metrics.escalationCount}</div>
                                </div>
                                <div style={{ padding: '10px', borderRadius: '8px', background: 'var(--bg-card)' }}>
                                  <div style={{ color: 'var(--text-muted)', marginBottom: '2px' }}>Rejections</div>
                                  <div style={{ fontWeight: 700, color: r.metrics.rejectedResolutions > 3 ? '#fca5a5' : 'inherit' }}>{r.metrics.rejectedResolutions}</div>
                                </div>
                                <div style={{ padding: '10px', borderRadius: '8px', background: 'var(--bg-card)' }}>
                                  <div style={{ color: 'var(--text-muted)', marginBottom: '2px' }}>Dept Rank</div>
                                  <div style={{ fontWeight: 700 }}>#{r.departmentRank}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
