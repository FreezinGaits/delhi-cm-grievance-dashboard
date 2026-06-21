'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';

const LiveMap = dynamic(() => import('../../components/LiveMap'), { ssr: false, loading: () => <div className="skeleton" style={{ height: '520px' }} /> });

// Format time ago for alerts
function formatTimeAgo(dateStr: string) {
  const date = new Date(dateStr);
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

function formatUserName(name: any) {
  if (!name) return 'Unassigned';
  if (typeof name === 'string') return name;
  if (name.first || name.last) {
    return `${name.first || ''} ${name.last || ''}`.trim();
  }
  return 'Unknown';
}

export default function CMDashboard() {
  const pathname = usePathname() || '';
  const activeTab = pathname.endsWith('/heatmap') ? 'heatmap' :
                    pathname.endsWith('/complaints') ? 'complaints' :
                    pathname.endsWith('/officers') ? 'officers' :
                    pathname.endsWith('/sla') ? 'sla' :
                    pathname.endsWith('/alerts') ? 'alerts' : 'overview';

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Tab-specific states
  const [allComplaints, setAllComplaints] = useState<any[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<any | null>(null);
  const [complaintsLoading, setComplaintsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [officerLedger, setOfficerLedger] = useState<any[]>([]);
  const [officerLoading, setOfficerLoading] = useState(false);
  const [slaData, setSlaData] = useState<any>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/cm/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'Content-Type': 'application/json',
        },
      });

      const resData = await res.json();
      if (resData.success) {
        setDashboardData(resData.data);
      } else {
        throw new Error(resData.error?.message || 'Failed to retrieve dashboard data');
      }
    } catch (err: any) {
      console.error('Error fetching dashboard summary:', err);
      setError(err.message || 'Connection to CM Dashboard API failed.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllComplaints = async () => {
    try {
      setComplaintsLoading(true);
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/complaints?limit=100`, {
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'Content-Type': 'application/json',
        },
      });
      const resData = await res.json();
      if (resData.success) {
        setAllComplaints(resData.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch all complaints:', err);
    } finally {
      setComplaintsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchOfficerLedger = async () => {
    try {
      setOfficerLoading(true);
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/cm/officer-ledger`, {
        headers: { 'Authorization': `Bearer ${token || ''}` },
      });
      const resData = await res.json();
      if (resData.success) setOfficerLedger(resData.data || []);
    } catch (err) {
      console.error('Failed to fetch officer ledger:', err);
    } finally {
      setOfficerLoading(false);
    }
  };

  const handleIssueWarning = async (officerId: string) => {
    const reason = prompt("Enter the reason for issuing a disciplinary warning to this officer:");
    if (!reason) return;
    
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/cm/officers/${officerId}/warning`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });
      const resData = await res.json();
      if (resData.success) {
        alert("Disciplinary warning issued successfully.");
        fetchOfficerLedger();
      } else {
        alert("Error: " + (resData.error?.message || "Failed to issue warning."));
      }
    } catch (err: any) {
      console.error(err);
      alert("Error: " + err.message);
    }
  };

  const handleToggleSuspend = async (officerId: string, isCurrentlySuspended: boolean) => {
    let reason = '';
    if (!isCurrentlySuspended) {
      reason = prompt("Enter the reason for suspending this officer:") || '';
      if (!reason) {
        alert("Suspension cancelled. A reason is required.");
        return;
      }
    } else {
      const confirmAction = confirm(`Are you sure you want to unsuspend this officer?`);
      if (!confirmAction) return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/cm/officers/${officerId}/suspend`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ suspend: !isCurrentlySuspended, reason })
      });
      const resData = await res.json();
      if (resData.success) {
        alert(`Officer ${isCurrentlySuspended ? 'unsuspended' : 'suspended'} successfully.`);
        fetchOfficerLedger();
      } else {
        alert("Error: " + (resData.error?.message || `Failed to modify officer status.`));
      }
    } catch (err: any) {
      console.error(err);
      alert("Error: " + err.message);
    }
  };

  useEffect(() => {
    if (activeTab === 'complaints') fetchAllComplaints();
    if (activeTab === 'officers') fetchOfficerLedger();
  }, [activeTab]);

  if (loading && !dashboardData) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ height: '40px', width: '250px' }} className="skeleton" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} style={{ height: '100px' }} className="skeleton" />
          ))}
        </div>
      </div>
    );
  }

  const summary = dashboardData?.summary || {
    totalComplaints: 0,
    openComplaints: 0,
    resolvedToday: 0,
    criticalActive: 0,
    slaBreaches: 0,
    citizenSatisfaction: 0,
  };

  const statusBreakdown = dashboardData?.statusBreakdown || {};
  const departmentPerformance = dashboardData?.departmentPerformance || [];
  const recentCritical = dashboardData?.recentCritical || [];
  
  const trendData = (dashboardData?.trendData || []).map((t: any) => {
    const d = new Date(t._id);
    const dateFormatted = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    return {
      date: dateFormatted,
      submitted: t.submitted || 0,
      resolved: t.resolved || 0,
    };
  });

  const statusList = [
    { key: 'submitted', label: 'Submitted', color: '#94a3b8' },
    { key: 'assigned', label: 'Assigned', color: '#3b82f6' },
    { key: 'in_progress', label: 'In Progress', color: '#f59e0b' },
    { key: 'provisionally_resolved', label: 'Provisionally Resolved', color: '#06b6d4' },
    { key: 'resolved', label: 'Resolved', color: '#10b981' },
    { key: 'rejected', label: 'Rejected', color: '#ef4444' },
    { key: 'closed', label: 'Closed', color: '#6b7280' },
    { key: 'escalated', label: 'Escalated', color: '#8b5cf6' },
  ];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 'clamp(1.25rem, 3vw, 1.75rem)', fontWeight: 800, marginBottom: '4px', textTransform: 'capitalize' }}>
            {activeTab === 'overview' ? 'Command Center' : `${activeTab} View`}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 'clamp(0.75rem, 1.5vw, 0.9rem)' }}>
            Real-time governance intelligence • Last updated: {new Date().toLocaleTimeString('en-IN')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button onClick={() => { fetchDashboardData(); if (activeTab === 'complaints') fetchAllComplaints(); }} className="btn btn-ghost" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px', borderRadius: '10px', marginBottom: '20px',
          background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
          color: '#fca5a5', fontSize: '0.85rem',
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Conditional Content Rendering */}
      {activeTab === 'overview' && (
        <>
          {/* KPI Cards */}
          <div className="stagger-children" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 155px), 1fr))', gap: '12px', marginBottom: '24px' }}>
            <StatCard label="Total Complaints" value={summary.totalComplaints.toLocaleString()} icon="📊" />
            <StatCard label="Open / Active" value={summary.openComplaints.toLocaleString()} icon="📂" variant="warning" />
            <StatCard label="Resolved Today" value={summary.resolvedToday.toString()} icon="✅" variant="success" />
            <StatCard label="Critical Active" value={summary.criticalActive.toString()} icon="🚨" variant="critical" pulse={summary.criticalActive > 0} />
            <StatCard label="SLA Breaches" value={summary.slaBreaches.toString()} icon="⏱️" variant="critical" />
            <StatCard label="Satisfaction" value={`${summary.citizenSatisfaction}%`} icon="😊" variant="success" />
          </div>

          {/* Delhi Happiness Index & Worst Performing Zones */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '16px', marginBottom: '24px' }}>
            {/* Happiness Index Card */}
            <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '180px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>🎯 Delhi Happiness Index</h3>
                  <span style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700,
                    background: (dashboardData?.happinessIndex?.rating === 'Excellent' ? 'rgba(16, 185, 129, 0.15)' : dashboardData?.happinessIndex?.rating === 'Satisfactory' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)'),
                    color: (dashboardData?.happinessIndex?.rating === 'Excellent' ? '#6ee7b7' : dashboardData?.happinessIndex?.rating === 'Satisfactory' ? '#fbbf24' : '#fca5a5')
                  }}>
                    {dashboardData?.happinessIndex?.rating || 'Calculating...'}
                  </span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '16px' }}>
                  Overall grievance resolution rate vs. target of {dashboardData?.happinessIndex?.target || 85}%.
                </p>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '6px' }}>
                  <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {dashboardData?.happinessIndex?.score || 0}%
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Target: {dashboardData?.happinessIndex?.target || 85}%
                  </span>
                </div>
                <div style={{ height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(dashboardData?.happinessIndex?.score || 0, 100)}%`,
                    background: 'var(--gradient-success)',
                    borderRadius: '4px',
                    transition: 'width 1s ease'
                  }} />
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: `${dashboardData?.happinessIndex?.target || 85}%`,
                    width: '2px',
                    background: '#ef4444',
                    opacity: 0.8
                  }} title="Target Level" />
                </div>
              </div>
            </div>

            {/* Worst Performing Municipal Zones Card */}
            <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '180px' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '4px' }}>🚨 Worst Performing Municipal Wards</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '12px' }}>
                  Wards with the highest volume of unresolved complaints.
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {!dashboardData?.worstZones || dashboardData.worstZones.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', margin: '20px 0' }}>
                    All zones performing optimally.
                  </p>
                ) : (
                  dashboardData.worstZones.map((z: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                        <span style={{ fontWeight: 600 }}>{idx + 1}. {z.zone}</span>
                        <span style={{ color: '#ef4444', fontWeight: 700 }}>{z.unresolved} unresolved</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <span>Total Filed: {z.total}</span>
                        <span>Res. Rate: {z.resolutionRate}%</span>
                      </div>
                      <div style={{ height: '4px', background: 'var(--bg-secondary)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${100 - z.resolutionRate}%`,
                          background: 'rgba(239, 68, 68, 0.7)',
                          borderRadius: '2px'
                        }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Main Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '16px', marginBottom: '24px' }}>
            {/* Trend Chart */}
            <div className="glass-card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '20px' }}>📈 Weekly Trend</h3>
              {trendData.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '180px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  No complaints in the last 7 days.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {trendData.map((day: any, i: number) => {
                    const maxVal = Math.max(...trendData.map((d: any) => Math.max(d.submitted, d.resolved))) || 1;
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', width: '60px' }}>{day.date}</span>
                        <div style={{ flex: 1, display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <div style={{ height: '20px', width: `${(day.submitted / maxVal) * 80}%`, background: 'var(--gradient-primary)', borderRadius: '4px', minWidth: '4px' }} />
                          <span style={{ fontSize: '0.7rem', color: '#93c5fd' }}>{day.submitted}</span>
                        </div>
                        <div style={{ flex: 1, display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <div style={{ height: '20px', width: `${(day.resolved / maxVal) * 80}%`, background: 'var(--gradient-success)', borderRadius: '4px', minWidth: '4px' }} />
                          <span style={{ fontSize: '0.7rem', color: '#6ee7b7' }}>{day.resolved}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div style={{ display: 'flex', gap: '16px', marginTop: '12px', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#93c5fd' }}>● Submitted</span>
                <span style={{ fontSize: '0.75rem', color: '#6ee7b7' }}>● Resolved</span>
              </div>
            </div>

            {/* Status Breakdown */}
            <div className="glass-card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '20px' }}>📊 Status Distribution</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {statusList.map(({ key, label, color }) => {
                  const count = statusBreakdown[key] || 0;
                  const total = Object.values(statusBreakdown).reduce((a: any, b: any) => a + b, 0) as number || 1;
                  const pct = ((count / total) * 100).toFixed(1);
                  return (
                    <div key={key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{label}</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{count.toLocaleString()} ({pct}%)</span>
                      </div>
                      <div style={{ height: '6px', background: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '3px', transition: 'width 1s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Department Performance + Critical Alerts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '16px' }}>
            <div className="glass-card" style={{ padding: '24px', overflow: 'hidden' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px' }}>🏢 Department Performance</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      {['Department', 'Total', 'Resolved', 'Pending', 'SLA ❌', 'Rate'].map((h) => (
                        <th key={h} style={{ padding: '10px 8px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {departmentPerformance.map((dept: any, i: number) => {
                      const deptInfo = dept.department || { name: 'Unknown', code: 'UNKN' };
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}>
                          <td style={{ padding: '12px 8px', fontWeight: 600 }}>
                            <span style={{ marginRight: '6px', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.1)', color: '#93c5fd' }}>{deptInfo.code}</span>
                            {deptInfo.name}
                          </td>
                          <td style={{ padding: '12px 8px' }}>{dept.total}</td>
                          <td style={{ padding: '12px 8px', color: '#6ee7b7' }}>{dept.resolved}</td>
                          <td style={{ padding: '12px 8px', color: '#fbbf24' }}>{dept.pending}</td>
                          <td style={{ padding: '12px 8px', color: dept.slaBreaches > 0 ? '#fca5a5' : 'var(--text-secondary)' }}>{dept.slaBreaches}</td>
                          <td style={{ padding: '12px 8px' }}>
                            <span style={{
                              padding: '3px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600,
                              background: dept.resolutionRate >= 80 ? 'rgba(16, 185, 129, 0.15)' : dept.resolutionRate >= 70 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                              color: dept.resolutionRate >= 80 ? '#6ee7b7' : dept.resolutionRate >= 70 ? '#fbbf24' : '#fca5a5',
                            }}>
                              {dept.resolutionRate}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>🚨 Critical Alerts</h3>
                <span className="badge badge-critical">{recentCritical.length} Active</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto' }}>
                {recentCritical.map((alert: any) => (
                  <div key={alert._id} style={{ padding: '14px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '4px' }}>{alert.title}</div>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>📍 {alert.address?.ward || 'General'}</span>
                      <span>🏢 {alert.assignedDepartment?.code || 'UNKN'}</span>
                      <span>🕐 {formatTimeAgo(alert.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'heatmap' && (
        <LiveMap
          apiUrl={process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}
          token={localStorage.getItem('accessToken') || ''}
        />
      )}

      {activeTab === 'complaints' && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ fontSize: 'clamp(0.95rem, 2vw, 1.1rem)', fontWeight: 700 }}>📋 Comprehensive Incident Ledger</h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', width: '100%', maxWidth: '440px' }}>
              <input
                className="input"
                style={{ padding: '8px 12px', fontSize: '0.8rem', flex: '1 1 180px', minWidth: 0 }}
                placeholder="Search Reference, title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <select className="input" style={{ padding: '8px', fontSize: '0.8rem' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All Statuses</option>
                {statusList.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {complaintsLoading ? (
            <div className="skeleton" style={{ height: '200px' }} />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    {['Reference', 'Title', 'Category', 'Dept', 'Status', 'Priority', 'Date'].map(h => (
                      <th key={h} style={{ padding: '10px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allComplaints
                    .filter(c => {
                      const matchesSearch = c.referenceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) || c.title?.toLowerCase().includes(searchQuery.toLowerCase());
                      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
                      return matchesSearch && matchesStatus;
                    })
                    .map(c => (
                      <tr 
                        key={c._id} 
                        style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}
                        onClick={() => setSelectedComplaint(c)}
                      >
                        <td style={{ padding: '12px 10px', fontWeight: 600 }}>{c.referenceNumber}</td>
                        <td style={{ padding: '12px 10px' }}>{c.title}</td>
                        <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>{c.category}</td>
                        <td style={{ padding: '12px 10px' }}>
                          <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)' }}>
                            {c.assignedDepartment?.code || 'UNASSIGNED'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 10px' }}>
                          <span className={`badge badge-${c.status}`} style={{ textTransform: 'capitalize', fontSize: '0.7rem' }}>
                            {c.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td style={{ padding: '12px 10px' }}>
                          <span className={`badge badge-${c.priority}`} style={{ fontSize: '0.7rem' }}>{c.priority}</span>
                        </td>
                        <td style={{ padding: '12px 10px', color: 'var(--text-muted)' }}>
                          {new Date(c.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'officers' && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px' }}>👮 Officer Workload Ledger (Live)</h3>
          {officerLoading ? (
            <div className="skeleton" style={{ height: '200px' }} />
          ) : officerLedger.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              No officers found. Officers will appear here once assigned to departments.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '16px' }}>
              {officerLedger.map((off: any, i: number) => {
                const isSuspended = off.officer?.isSuspended;
                const loadColor = isSuspended ? '#ef4444' : off.status === 'overloaded' ? '#ef4444' : off.status === 'busy' ? '#f59e0b' : '#10b981';
                const loadLabel = isSuspended ? 'Suspended' : off.status === 'overloaded' ? 'Overloaded' : off.status === 'busy' ? 'Busy' : 'Available';
                const warningsCount = off.officer?.warnings?.length || 0;
                return (
                  <div key={i} className="stat-card" style={{ background: 'var(--bg-secondary)', border: `1px solid ${isSuspended ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-color)'}`, padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {off.officer?.name || 'Unknown'}
                            {isSuspended && <span style={{ fontSize: '0.65rem', background: '#ef4444', color: 'white', padding: '2px 4px', borderRadius: '3px', fontWeight: 'bold' }}>SUSPENDED</span>}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ward: {off.officer?.ward || 'Unassigned'}</div>
                        </div>
                        <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(59,130,246,0.1)', color: '#93c5fd', fontWeight: 700 }}>{off.department?.code || 'N/A'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginTop: '12px' }}>
                        <span>Active: <strong>{off.activeTickets}</strong></span>
                        <span>Resolved: <strong>{off.resolvedTickets}</strong></span>
                      </div>
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Load: {off.loadPercent}%</span>
                          <span style={{ fontWeight: 700, color: loadColor }}>{loadLabel}</span>
                        </div>
                        <div style={{ height: '6px', background: 'var(--bg-primary)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min(off.loadPercent, 100)}%`, background: loadColor, borderRadius: '3px', transition: 'width 0.5s ease' }} />
                        </div>
                      </div>
                      <div style={{ marginTop: '12px', fontSize: '0.8rem', color: warningsCount > 0 ? '#fca5a5' : 'var(--text-muted)' }}>
                        ⚠️ Disciplinary Warnings: <strong>{warningsCount}</strong>
                      </div>
                      {isSuspended && off.officer?.suspensionReason && (
                        <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#fca5a5', background: 'rgba(239, 68, 68, 0.1)', padding: '6px', borderRadius: '4px', border: '1px dashed rgba(239, 68, 68, 0.3)' }}>
                          <strong>Reason:</strong> {off.officer.suspensionReason}
                        </div>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                      <button 
                        onClick={() => handleIssueWarning(off.officer?.id)} 
                        className="btn btn-ghost" 
                        style={{ flex: 1, padding: '6px', fontSize: '0.75rem', borderColor: 'rgba(245, 158, 11, 0.4)', color: '#f59e0b' }}
                      >
                        ⚠️ Reprimand
                      </button>
                      <button 
                        onClick={() => handleToggleSuspend(off.officer?.id, !!isSuspended)} 
                        className="btn" 
                        style={{ 
                          flex: 1, 
                          padding: '6px', 
                          fontSize: '0.75rem', 
                          background: isSuspended ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', 
                          color: isSuspended ? '#10b981' : '#ef4444',
                          border: `1px solid ${isSuspended ? '#10b981' : '#ef4444'}` 
                        }}
                      >
                        {isSuspended ? '✔️ Restore' : '🚫 Suspend'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'sla' && (() => {
        const slaOverview = dashboardData?.slaOverview || { avgResolutionHours: 0, overallCompliance: 100, unresolvedBreaches: 0 };
        const slaReport = dashboardData?.slaReport || [];
        return (
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px' }}>⏱️ SLA Compliance & Breaches (Live)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '12px', marginBottom: '24px' }}>
            <div className="stat-card">
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Average Resolution Time</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{slaOverview.avgResolutionHours} Hours</div>
            </div>
            <div className="stat-card critical">
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Unresolved Breaches</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fca5a5' }}>{slaOverview.unresolvedBreaches}</div>
            </div>
            <div className="stat-card success">
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>SLA Compliance Rate</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#6ee7b7' }}>{slaOverview.overallCompliance}%</div>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  {['Department', 'SLA Target', 'Breached', 'Avg Resolution', 'Compliance'].map(h => (
                    <th key={h} style={{ padding: '10px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slaReport.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No SLA data available yet.</td></tr>
                ) : slaReport.map((row: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 10px', fontWeight: 600 }}>{row.department?.name} ({row.department?.code})</td>
                    <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>{row.slaTarget}</td>
                    <td style={{ padding: '12px 10px', color: '#fca5a5', fontWeight: 600 }}>{row.breached}</td>
                    <td style={{ padding: '12px 10px' }}>{row.avgResolutionHours}h</td>
                    <td style={{ padding: '12px 10px' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: '4px', fontWeight: 700,
                        background: row.complianceRate >= 80 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        color: row.complianceRate >= 80 ? '#6ee7b7' : '#fca5a5',
                      }}>{row.complianceRate}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        );
      })()}

      {activeTab === 'alerts' && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px' }}>🚨 All Critical Safety Alerts</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {recentCritical.map((alert: any) => (
              <div key={alert._id} style={{ padding: '20px', borderRadius: '14px', background: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                    <span className="badge badge-critical">CRITICAL</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{alert.referenceNumber}</span>
                  </div>
                  <h4 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '6px' }}>{alert.title}</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>{alert.description}</p>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span>📍 Ward: {alert.address?.ward || 'General'}</span>
                    <span>🏢 Department: {alert.assignedDepartment?.code || 'UNKN'}</span>
                    <span>🕐 Submitted: {new Date(alert.createdAt).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Selected Complaint Detail Modal */}
      {selectedComplaint && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)', padding: '16px'
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
              <div>
                <span className="badge badge-ghost" style={{ marginRight: '8px', fontSize: '0.8rem' }}>📋 {selectedComplaint.referenceNumber}</span>
                <span className={`badge badge-${selectedComplaint.status}`} style={{ textTransform: 'capitalize', fontSize: '0.8rem', marginRight: '8px' }}>
                  {selectedComplaint.status.replace(/_/g, ' ')}
                </span>
                <span className={`badge badge-${selectedComplaint.priority}`} style={{ fontSize: '0.8rem' }}>
                  {selectedComplaint.priority} Priority
                </span>
              </div>
              <button 
                onClick={() => setSelectedComplaint(null)} 
                className="btn btn-ghost" 
                style={{ padding: '4px 8px', minWidth: 'auto', fontSize: '1.2rem', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Title & Description */}
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>{selectedComplaint.title}</h2>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                    {selectedComplaint.description}
                  </p>
                </div>

                {/* Citizen Media */}
                {selectedComplaint.media && selectedComplaint.media.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Citizen Uploads</h4>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {selectedComplaint.media.map((item: any, idx: number) => {
                        const url = item.url.startsWith('/') ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${item.url}` : item.url;
                        return (
                          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt="Citizen grievance media"
                              style={{ maxWidth: '100%', maxHeight: '160px', borderRadius: '6px', border: '1px solid var(--border-color)', objectFit: 'contain' }}
                            />
                            {item.metadata?.gpsLat && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                📍 {item.metadata.gpsLat.toFixed(4)}, {item.metadata.gpsLng.toFixed(4)}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Resolution Evidence */}
                {selectedComplaint.resolutionEvidence && (
                  <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#6ee7b7', marginBottom: '8px' }}>🔍 Resolution Evidence</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                      <strong>Officer Notes:</strong> &ldquo;{selectedComplaint.resolutionEvidence.description || 'No explanation notes.'}&rdquo;
                    </p>
                    {selectedComplaint.resolutionEvidence.media && selectedComplaint.resolutionEvidence.media.length > 0 && (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {selectedComplaint.resolutionEvidence.media.map((item: any, idx: number) => {
                          const url = item.url.startsWith('/') ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${item.url}` : item.url;
                          return (
                            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={url}
                                alt="Resolution evidence media"
                                style={{ maxWidth: '100%', maxHeight: '180px', borderRadius: '6px', border: '1px solid var(--border-color)', objectFit: 'contain' }}
                              />
                              {item.metadata?.gpsLat && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  📍 Verified GPS Coordinate Check: {item.metadata.gpsLat.toFixed(6)}, {item.metadata.gpsLng.toFixed(6)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Spot Directive */}
                {selectedComplaint.spotDirective && (
                  <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fca5a5', marginBottom: '4px' }}>🚨 Spot Directive Issued</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      &ldquo;{selectedComplaint.spotDirective.directive}&rdquo;
                    </p>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Priority: <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{selectedComplaint.spotDirective.priority.replace(/_/g, ' ')}</span> •
                      Issued: {new Date(selectedComplaint.spotDirective.issuedAt).toLocaleString('en-IN')}
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderLeft: '1px solid var(--border-color)', paddingLeft: '16px' }}>
                <div>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Department Routing</h4>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                    {selectedComplaint.assignedDepartment?.name || 'Pending routing'} ({selectedComplaint.assignedDepartment?.code || 'N/A'})
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Assigned Field Officer</h4>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                    {formatUserName(selectedComplaint.assignedOfficer)}
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>SLA Target</h4>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: selectedComplaint.sla?.breached ? '#ef4444' : '#fbbf24' }}>
                    {selectedComplaint.sla?.deadline ? new Date(selectedComplaint.sla.deadline).toLocaleString('en-IN') : 'N/A'}
                    {selectedComplaint.sla?.breached && ' (BREACHED ❌)'}
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Date Submitted</h4>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                    {new Date(selectedComplaint.createdAt).toLocaleString('en-IN')}
                  </div>
                </div>

                {/* Citizen Feedback */}
                {selectedComplaint.citizenFeedback && (
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                    <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>Citizen Review</h4>
                    <div style={{ display: 'flex', gap: '4px', fontSize: '1.25rem', color: '#fbbf24', marginBottom: '6px' }}>
                      {selectedComplaint.citizenFeedback.rating ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <span key={i} style={{ opacity: i < selectedComplaint.citizenFeedback.rating ? 1 : 0.2 }}>★</span>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: 600 }}>REJECTED ❌</span>
                      )}
                    </div>
                    {selectedComplaint.citizenFeedback.rejectionReason && (
                      <p style={{ fontSize: '0.85rem', color: '#fca5a5', fontStyle: 'italic', background: 'rgba(239, 68, 68, 0.05)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                        <strong>Rejection Reason:</strong> &ldquo;{selectedComplaint.citizenFeedback.rejectionReason}&rdquo;
                      </p>
                    )}
                    {selectedComplaint.citizenFeedback.ratingComment && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        &ldquo;{selectedComplaint.citizenFeedback.ratingComment}&rdquo;
                      </p>
                    )}
                  </div>
                )}

                {/* Escalation History */}
                {selectedComplaint.escalationHistory && selectedComplaint.escalationHistory.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                    <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Escalation Logs</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
                      {selectedComplaint.escalationHistory.map((item: any, idx: number) => (
                        <div key={idx} style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                          <span style={{ fontWeight: 600, color: '#fca5a5' }}>Level {item.level} Escalation</span>
                          <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>{item.reason}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, variant, pulse }: {
  label: string; value: string; icon: string; variant?: string; pulse?: boolean;
}) {
  return (
    <div className={`stat-card ${variant || ''} ${pulse ? 'pulse-critical' : ''}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: '1.2rem' }}>{icon}</span>
      </div>
      <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{value}</div>
    </div>
  );
}
