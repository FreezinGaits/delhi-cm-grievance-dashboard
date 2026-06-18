'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

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
  const [complaintsLoading, setComplaintsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

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

  useEffect(() => {
    if (activeTab === 'complaints') {
      fetchAllComplaints();
    }
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '4px', textTransform: 'capitalize' }}>
            {activeTab === 'overview' ? 'Command Center' : `${activeTab} View`}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Real-time governance intelligence • Last updated: {new Date().toLocaleTimeString('en-IN')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => { fetchDashboardData(); if (activeTab === 'complaints') fetchAllComplaints(); }} className="btn btn-ghost" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
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
          <div className="stagger-children" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '28px' }}>
            <StatCard label="Total Complaints" value={summary.totalComplaints.toLocaleString()} icon="📊" />
            <StatCard label="Open / Active" value={summary.openComplaints.toLocaleString()} icon="📂" variant="warning" />
            <StatCard label="Resolved Today" value={summary.resolvedToday.toString()} icon="✅" variant="success" />
            <StatCard label="Critical Active" value={summary.criticalActive.toString()} icon="🚨" variant="critical" pulse={summary.criticalActive > 0} />
            <StatCard label="SLA Breaches" value={summary.slaBreaches.toString()} icon="⏱️" variant="critical" />
            <StatCard label="Satisfaction" value={`${summary.citizenSatisfaction}%`} icon="😊" variant="success" />
          </div>

          {/* Main Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '20px' }}>
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
        <div className="glass-card" style={{ padding: '28px', minHeight: '500px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>🗺️ Live Incident Geolocation Heatmap</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Displaying civic hotspots and critical clusters across NCT Delhi</p>
            </div>
            <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem' }}>
              <span style={{ color: '#ef4444' }}>● Critical (Auto-routed)</span>
              <span style={{ color: '#fbbf24' }}>● High</span>
              <span style={{ color: '#3b82f6' }}>● Normal</span>
            </div>
          </div>

          <div style={{
            flex: 1, height: '400px', borderRadius: '16px', background: 'radial-gradient(circle, #0f172a 10%, #020617 90%)',
            border: '1px solid var(--border-color)', position: 'relative', overflow: 'hidden', display: 'flex',
            alignItems: 'center', justifyContent: 'center'
          }}>
            {/* Visual simulation of Delhi Map */}
            <div style={{ position: 'absolute', width: '80%', height: '80%', opacity: 0.1, border: '2px dashed #3b82f6', borderRadius: '50%' }} />
            <div style={{ position: 'absolute', width: '50%', height: '50%', opacity: 0.15, border: '2px dashed #06b6d4', borderRadius: '50%' }} />
            
            {/* Simulated hotspots */}
            <div style={{ position: 'absolute', top: '35%', left: '45%', width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 20px #ef4444' }} className="pulse-critical" />
            <div style={{ position: 'absolute', top: '38%', left: '46%', fontSize: '0.7rem', color: '#fca5a5', fontWeight: 700 }}>Karol Bagh (5 issues)</div>
            
            <div style={{ position: 'absolute', top: '20%', left: '30%', width: '12px', height: '12px', borderRadius: '50%', background: '#fbbf24', boxShadow: '0 0 15px #fbbf24' }} />
            <div style={{ position: 'absolute', top: '23%', left: '31%', fontSize: '0.7rem', color: '#fde047' }}>Rohini (3 issues)</div>

            <div style={{ position: 'absolute', top: '55%', left: '25%', width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 20px #ef4444' }} className="pulse-critical" />
            <div style={{ position: 'absolute', top: '58%', left: '26%', fontSize: '0.7rem', color: '#fca5a5', fontWeight: 700 }}>Dwarka (7 issues)</div>

            <div style={{ position: 'absolute', top: '65%', left: '60%', width: '12px', height: '12px', borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 10px #3b82f6' }} />
            <div style={{ position: 'absolute', top: '68%', left: '61%', fontSize: '0.7rem', color: '#93c5fd' }}>Lajpat Nagar (2 issues)</div>

            <div style={{ position: 'absolute', bottom: '20px', left: '20px', padding: '12px', background: 'rgba(15, 23, 42, 0.85)', borderRadius: '10px', fontSize: '0.8rem', border: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: 700, marginBottom: '4px' }}>Map Diagnostics</div>
              <div>Center: 28.6139° N, 77.2090° E</div>
              <div>Active Clusters: 18</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'complaints' && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>📋 Comprehensive Incident Ledger</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                className="input"
                style={{ padding: '8px 12px', fontSize: '0.8rem', width: '220px' }}
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
                      <tr key={c._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
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
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px' }}>👮 Officer Workload Ledger</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            {[
              { name: 'Priya Singh', email: 'priya.singh@delhi.gov.in', dept: 'DJB', active: 8, resolved: 34, load: 'Optimal' },
              { name: 'Rajesh Verma', email: 'rajesh.verma@delhi.gov.in', dept: 'PWD', active: 14, resolved: 58, load: 'High' },
              { name: 'Amit Gupta', email: 'amit.gupta@delhi.gov.in', dept: 'MCD', active: 5, resolved: 19, load: 'Low' },
              { name: 'Sanjay Kumar', email: 'sanjay.k@delhi.gov.in', dept: 'BSES', active: 11, resolved: 42, load: 'High' },
              { name: 'Neha Sharma', email: 'neha.sharma@delhi.gov.in', dept: 'POLICE', active: 7, resolved: 27, load: 'Optimal' }
            ].map((off, i) => (
              <div key={i} className="stat-card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{off.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{off.email}</div>
                  </div>
                  <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(59,130,246,0.1)', color: '#93c5fd', fontWeight: 700 }}>{off.dept}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginTop: '12px' }}>
                  <span>Active Tasks: <strong>{off.active}</strong></span>
                  <span>Resolved: <strong>{off.resolved}</strong></span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Bandwidth:</span>
                  <span style={{
                    fontWeight: 700,
                    color: off.load === 'High' ? '#ef4444' : off.load === 'Optimal' ? '#10b981' : '#3b82f6'
                  }}>{off.load}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'sla' && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px' }}>⏱️ SLA compliance & Breaches</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <div className="stat-card">
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Average Resolution Time</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>18.4 Hours</div>
            </div>
            <div className="stat-card critical">
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Unresolved Breaches</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fca5a5' }}>{summary.slaBreaches}</div>
            </div>
            <div className="stat-card success">
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>SLA Compliance Rate</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#6ee7b7' }}>82.1%</div>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  {['Department', 'SLA Target', 'Breached Tickets', 'Compliance Rate'].map(h => (
                    <th key={h} style={{ padding: '10px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { dept: 'Delhi Jal Board (DJB)', target: '24 Hours', breaches: 18, rate: '80.2%' },
                  { dept: 'Public Works Department (PWD)', target: '48 Hours', breaches: 19, rate: '81.5%' },
                  { dept: 'Municipal Corporation (MCD)', target: '36 Hours', breaches: 20, rate: '79.1%' },
                  { dept: 'BSES Electricity (BSES)', target: '12 Hours', breaches: 18, rate: '84.6%' },
                  { dept: 'Delhi Police (POLICE)', target: '24 Hours', breaches: 17, rate: '85.1%' }
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 10px', fontWeight: 600 }}>{row.dept}</td>
                    <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>{row.target}</td>
                    <td style={{ padding: '12px 10px', color: '#fca5a5', fontWeight: 600 }}>{row.breaches}</td>
                    <td style={{ padding: '12px 10px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '4px', background: 'rgba(16,185,129,0.1)', color: '#6ee7b7', fontWeight: 700 }}>{row.rate}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
