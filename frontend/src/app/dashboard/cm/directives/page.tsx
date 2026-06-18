'use client';

import { useState, useEffect, useCallback } from 'react';

interface Directive {
  _id: string;
  directive: string;
  priority: string;
  status: string;
  deadline: string;
  createdAt: string;
  acknowledgedAt?: string;
  completedAt?: string;
  completionNotes?: string;
  complaintId?: {
    referenceNumber?: string;
    title?: string;
    category?: string;
    address?: { ward?: string };
  };
  issuedBy?: { name?: string };
  assignedOfficer?: { name?: string; email?: string };
  assignedDepartment?: { name?: string; code?: string };
}

interface DirectiveStats {
  total: number;
  created: number;
  acknowledged: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const priorityConfig: Record<string, { label: string; color: string; bg: string }> = {
  immediate: { label: 'IMMEDIATE', color: '#fca5a5', bg: 'rgba(239, 68, 68, 0.15)' },
  within_24h: { label: 'WITHIN 24H', color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.15)' },
  within_week: { label: 'WITHIN WEEK', color: '#93c5fd', bg: 'rgba(59, 130, 246, 0.15)' },
};

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  created: { label: 'Awaiting Ack', color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.25)' },
  acknowledged: { label: 'Acknowledged', color: '#93c5fd', bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.25)' },
  in_progress: { label: 'In Progress', color: '#c4b5fd', bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.25)' },
  completed: { label: 'Completed', color: '#6ee7b7', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.25)' },
  overdue: { label: 'OVERDUE', color: '#fca5a5', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.25)' },
};

export default function DirectivesPage() {
  const [directives, setDirectives] = useState<Directive[]>([]);
  const [stats, setStats] = useState<DirectiveStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [newDirective, setNewDirective] = useState({ complaintId: '', directive: '', priority: 'immediate' });
  const [issuing, setIssuing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
  const headers = { 'Authorization': `Bearer ${token || ''}`, 'Content-Type': 'application/json' };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [directivesRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/directives?limit=50`, { headers }),
        fetch(`${API_BASE}/api/v1/directives/stats`, { headers }),
      ]);
      const dData = await directivesRes.json();
      const sData = await statsRes.json();
      if (dData.success) setDirectives(dData.data?.directives || []);
      if (sData.success) setStats(sData.data);
    } catch (err) {
      console.error('Failed to fetch directives:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const issueDirective = async () => {
    if (!newDirective.complaintId || !newDirective.directive) return;
    setIssuing(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/directives`, {
        method: 'POST', headers,
        body: JSON.stringify(newDirective),
      });
      const data = await res.json();
      if (data.success) {
        setShowIssueModal(false);
        setNewDirective({ complaintId: '', directive: '', priority: 'immediate' });
        fetchData();
      }
    } catch (err) {
      console.error('Failed to issue directive:', err);
    } finally {
      setIssuing(false);
    }
  };

  const formatDeadline = (deadline: string) => {
    const d = new Date(deadline);
    const now = new Date();
    const diff = d.getTime() - now.getTime();
    if (diff < 0) return { text: 'OVERDUE', isOverdue: true };
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    if (hours > 24) return { text: `${Math.floor(hours / 24)}d ${hours % 24}h left`, isOverdue: false };
    return { text: `${hours}h ${minutes}m left`, isOverdue: hours < 2 };
  };

  const filteredDirectives = statusFilter === 'all' ? directives : directives.filter(d => d.status === statusFilter);

  if (loading && !stats) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ height: '40px', width: '300px' }} className="skeleton" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px' }}>
          {[1,2,3,4,5,6].map(i => <div key={i} style={{ height: '80px' }} className="skeleton" />)}
        </div>
        <div style={{ height: '400px' }} className="skeleton" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '4px' }}>📋 CM Spot Directives</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Issue and track field directives with deadline enforcement</p>
        </div>
        <button onClick={() => setShowIssueModal(true)} className="btn btn-primary" style={{ gap: '6px' }}>
          ⚡ Issue Directive
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="stagger-children" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          <StatMini label="Total" value={stats.total} icon="📋" />
          <StatMini label="Awaiting" value={stats.created} icon="⏳" color="#fbbf24" />
          <StatMini label="Acknowledged" value={stats.acknowledged} icon="✋" color="#93c5fd" />
          <StatMini label="In Progress" value={stats.inProgress} icon="🔄" color="#c4b5fd" />
          <StatMini label="Completed" value={stats.completed} icon="✅" color="#6ee7b7" />
          <StatMini label="Overdue" value={stats.overdue} icon="🚨" color="#fca5a5" pulse={stats.overdue > 0} />
        </div>
      )}

      {/* Filter */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {['all', 'created', 'acknowledged', 'in_progress', 'completed', 'overdue'].map(f => (
          <button key={f} onClick={() => setStatusFilter(f)}
            className={statusFilter === f ? 'btn btn-primary' : 'btn btn-ghost'}
            style={{ padding: '6px 14px', fontSize: '0.8rem', textTransform: 'capitalize' }}>
            {f === 'all' ? 'All' : f.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Directives List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredDirectives.length === 0 ? (
          <div className="glass-card" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📋</div>
            <p>No directives found. Issue one during a field visit.</p>
          </div>
        ) : (
          filteredDirectives.map(d => {
            const deadline = formatDeadline(d.deadline);
            const sConf = statusConfig[d.status] || statusConfig.created;
            const pConf = priorityConfig[d.priority] || priorityConfig.immediate;
            return (
              <div key={d._id} className="glass-card" style={{
                padding: '20px', borderLeft: `3px solid ${sConf.color}`,
                ...(d.status === 'overdue' ? { animation: 'pulse-glow 2s ease-in-out infinite' } : {}),
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700, color: sConf.color, background: sConf.bg, border: `1px solid ${sConf.border}` }}>
                        {sConf.label}
                      </span>
                      <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700, color: pConf.color, background: pConf.bg }}>
                        {pConf.label}
                      </span>
                      {d.complaintId?.referenceNumber && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {d.complaintId.referenceNumber}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '6px', lineHeight: 1.4 }}>
                      &ldquo;{d.directive}&rdquo;
                    </p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      {d.complaintId?.title || 'Unknown complaint'} — {d.complaintId?.category || ''}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: '120px' }}>
                    <div style={{
                      fontSize: '0.85rem', fontWeight: 700,
                      color: deadline.isOverdue ? '#fca5a5' : '#6ee7b7',
                      marginBottom: '4px',
                    }}>
                      {deadline.text}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Deadline: {new Date(d.deadline).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '20px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <span>👮 {d.assignedOfficer?.name || 'Unassigned'}</span>
                  <span>🏢 {d.assignedDepartment?.name || d.assignedDepartment?.code || 'N/A'}</span>
                  <span>📍 {d.complaintId?.address?.ward || 'Delhi'}</span>
                  <span>🕐 Issued: {new Date(d.createdAt).toLocaleDateString('en-IN')}</span>
                  {d.issuedBy?.name && <span>👤 By: {d.issuedBy.name}</span>}
                </div>
                {d.completionNotes && (
                  <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.15)', fontSize: '0.85rem', color: '#6ee7b7' }}>
                    ✅ <strong>Completion:</strong> {d.completionNotes}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Issue Directive Modal */}
      {showIssueModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }} onClick={() => setShowIssueModal(false)}>
          <div className="glass-card" style={{ padding: '32px', width: '520px', maxWidth: '90vw' }}
            onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '20px' }}>⚡ Issue Spot Directive</h2>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>Complaint ID</label>
              <input className="input" placeholder="Paste complaint ObjectId..."
                value={newDirective.complaintId}
                onChange={e => setNewDirective({ ...newDirective, complaintId: e.target.value })} />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>Directive</label>
              <textarea className="input" rows={3} placeholder="CM directive text..."
                value={newDirective.directive} style={{ resize: 'vertical' }}
                onChange={e => setNewDirective({ ...newDirective, directive: e.target.value })} />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>Priority</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['immediate', 'within_24h', 'within_week'] as const).map(p => {
                  const pc = priorityConfig[p];
                  return (
                    <button key={p} onClick={() => setNewDirective({ ...newDirective, priority: p })}
                      style={{
                        flex: 1, padding: '10px', borderRadius: '10px', border: `2px solid ${newDirective.priority === p ? pc.color : 'var(--border-color)'}`,
                        background: newDirective.priority === p ? pc.bg : 'transparent', color: newDirective.priority === p ? pc.color : 'var(--text-muted)',
                        cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem',
                      }}>
                      {pc.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setShowIssueModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={issueDirective} disabled={issuing || !newDirective.complaintId || !newDirective.directive}>
                {issuing ? '⏳ Issuing...' : '⚡ Issue Directive'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatMini({ label, value, icon, color, pulse }: { label: string; value: number; icon: string; color?: string; pulse?: boolean }) {
  return (
    <div className={`stat-card ${pulse ? 'pulse-critical' : ''}`} style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</span>
        <span>{icon}</span>
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: color || 'var(--text-primary)' }}>{value}</div>
    </div>
  );
}
