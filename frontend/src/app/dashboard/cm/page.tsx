'use client';

import { useState, useEffect } from 'react';

// Mock data for demonstration (in production, fetch from API)
const MOCK_SUMMARY = {
  totalComplaints: 12847,
  openComplaints: 3421,
  resolvedToday: 187,
  criticalActive: 23,
  slaBreaches: 89,
  citizenSatisfaction: 78.5,
};

const MOCK_STATUS = {
  submitted: 892, assigned: 1247, in_progress: 982, provisionally_resolved: 300,
  resolved: 7856, rejected: 142, closed: 1228, escalated: 200,
};

const MOCK_DEPARTMENTS = [
  { name: 'Delhi Jal Board', code: 'DJB', total: 3241, resolved: 2456, pending: 785, slaBreaches: 34, resolutionRate: 76 },
  { name: 'Public Works Dept', code: 'PWD', total: 2890, resolved: 2100, pending: 790, slaBreaches: 22, resolutionRate: 73 },
  { name: 'Municipal Corp', code: 'MCD', total: 3102, resolved: 2567, pending: 535, slaBreaches: 12, resolutionRate: 83 },
  { name: 'BSES Power', code: 'BSES', total: 2014, resolved: 1789, pending: 225, slaBreaches: 8, resolutionRate: 89 },
  { name: 'Delhi Police', code: 'POLICE', total: 1600, resolved: 1200, pending: 400, slaBreaches: 13, resolutionRate: 75 },
];

const MOCK_TREND = [
  { date: 'Jun 11', submitted: 42, resolved: 38 },
  { date: 'Jun 12', submitted: 55, resolved: 48 },
  { date: 'Jun 13', submitted: 38, resolved: 41 },
  { date: 'Jun 14', submitted: 61, resolved: 52 },
  { date: 'Jun 15', submitted: 47, resolved: 44 },
  { date: 'Jun 16', submitted: 53, resolved: 49 },
  { date: 'Jun 17', submitted: 34, resolved: 28 },
];

const MOCK_CRITICAL = [
  { id: '1', ref: 'DEL-20260617-00012', title: 'Live wire dangling near school', ward: 'Rohini', dept: 'BSES', time: '23 min ago' },
  { id: '2', ref: 'DEL-20260617-00008', title: 'Sewer overflow on main road', ward: 'Karol Bagh', dept: 'MCD', time: '1 hr ago' },
  { id: '3', ref: 'DEL-20260617-00005', title: 'Open manhole near park', ward: 'Dwarka', dept: 'MCD', time: '2 hrs ago' },
  { id: '4', ref: 'DEL-20260616-00045', title: 'Gas leak reported in residential area', ward: 'Saket', dept: 'DJB', time: '5 hrs ago' },
];

export default function CMDashboard() {
  const [timeRange, setTimeRange] = useState('7d');

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '4px' }}>Command Center</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Real-time governance intelligence • Last updated: {new Date().toLocaleTimeString('en-IN')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['24h', '7d', '30d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={timeRange === range ? 'btn btn-primary' : 'btn btn-ghost'}
              style={{ padding: '8px 16px', fontSize: '0.8rem' }}
            >{range}</button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stagger-children" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <StatCard label="Total Complaints" value={MOCK_SUMMARY.totalComplaints.toLocaleString()} icon="📊" />
        <StatCard label="Open / Active" value={MOCK_SUMMARY.openComplaints.toLocaleString()} icon="📂" variant="warning" />
        <StatCard label="Resolved Today" value={MOCK_SUMMARY.resolvedToday.toString()} icon="✅" variant="success" />
        <StatCard label="Critical Active" value={MOCK_SUMMARY.criticalActive.toString()} icon="🚨" variant="critical" pulse />
        <StatCard label="SLA Breaches" value={MOCK_SUMMARY.slaBreaches.toString()} icon="⏱️" variant="critical" />
        <StatCard label="Satisfaction" value={`${MOCK_SUMMARY.citizenSatisfaction}%`} icon="😊" variant="success" />
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>
        {/* Trend Chart */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '20px' }}>📈 Weekly Trend</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {MOCK_TREND.map((day, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', width: '60px' }}>{day.date}</span>
                <div style={{ flex: 1, display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <div style={{ height: '20px', width: `${(day.submitted / 70) * 100}%`, background: 'var(--gradient-primary)', borderRadius: '4px', minWidth: '4px' }} />
                  <span style={{ fontSize: '0.7rem', color: '#93c5fd' }}>{day.submitted}</span>
                </div>
                <div style={{ flex: 1, display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <div style={{ height: '20px', width: `${(day.resolved / 70) * 100}%`, background: 'var(--gradient-success)', borderRadius: '4px', minWidth: '4px' }} />
                  <span style={{ fontSize: '0.7rem', color: '#6ee7b7' }}>{day.resolved}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '12px', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: '#93c5fd' }}>● Submitted</span>
            <span style={{ fontSize: '0.75rem', color: '#6ee7b7' }}>● Resolved</span>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '20px' }}>📊 Status Distribution</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {Object.entries(MOCK_STATUS).map(([status, count]) => {
              const total = Object.values(MOCK_STATUS).reduce((a, b) => a + b, 0);
              const pct = ((count / total) * 100).toFixed(1);
              const colors: Record<string, string> = {
                submitted: '#94a3b8', assigned: '#3b82f6', in_progress: '#f59e0b',
                provisionally_resolved: '#06b6d4', resolved: '#10b981', rejected: '#ef4444',
                closed: '#6b7280', escalated: '#8b5cf6',
              };
              return (
                <div key={status}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                      {status.replace(/_/g, ' ')}
                    </span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{count.toLocaleString()} ({pct}%)</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: colors[status] || '#64748b', borderRadius: '3px', transition: 'width 1s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Department Performance + Critical Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '20px' }}>
        {/* Department Table */}
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
                {MOCK_DEPARTMENTS.map((dept, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 8px', fontWeight: 600 }}>
                      <span style={{ marginRight: '6px', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.1)', color: '#93c5fd' }}>{dept.code}</span>
                      {dept.name}
                    </td>
                    <td style={{ padding: '12px 8px' }}>{dept.total.toLocaleString()}</td>
                    <td style={{ padding: '12px 8px', color: '#6ee7b7' }}>{dept.resolved.toLocaleString()}</td>
                    <td style={{ padding: '12px 8px', color: '#fbbf24' }}>{dept.pending}</td>
                    <td style={{ padding: '12px 8px', color: dept.slaBreaches > 20 ? '#fca5a5' : 'var(--text-secondary)' }}>{dept.slaBreaches}</td>
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
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Critical Alerts */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>🚨 Critical Alerts</h3>
            <span className="badge badge-critical pulse-critical">{MOCK_CRITICAL.length} Active</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {MOCK_CRITICAL.map((alert) => (
              <div
                key={alert.id}
                style={{
                  padding: '14px', borderRadius: '12px',
                  background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.transform = 'translateX(4px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'; e.currentTarget.style.transform = 'none'; }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '4px' }}>{alert.title}</div>
                <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>📍 {alert.ward}</span>
                  <span>🏢 {alert.dept}</span>
                  <span>🕐 {alert.time}</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>{alert.ref}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
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
