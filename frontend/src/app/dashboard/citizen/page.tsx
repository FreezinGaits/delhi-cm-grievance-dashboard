'use client';

import { useState } from 'react';
import Link from 'next/link';

const MOCK_COMPLAINTS = [
  { id: '1', ref: 'DEL-20260615-00023', title: 'Pipe burst on main road', category: 'Water Supply', status: 'in_progress', priority: 'high', dept: 'DJB', ward: 'Karol Bagh', date: '2026-06-15', slaBreached: false },
  { id: '2', ref: 'DEL-20260614-00012', title: 'Streetlight not working for 3 days', category: 'Electricity', status: 'provisionally_resolved', priority: 'normal', dept: 'BSES', ward: 'Rohini', date: '2026-06-14', slaBreached: false },
  { id: '3', ref: 'DEL-20260610-00045', title: 'Garbage pile near school gate', category: 'Sanitation', status: 'resolved', priority: 'normal', dept: 'MCD', ward: 'Dwarka', date: '2026-06-10', slaBreached: false },
  { id: '4', ref: 'DEL-20260609-00031', title: 'Deep pothole causing accidents', category: 'Roads', status: 'assigned', priority: 'critical', dept: 'PWD', ward: 'Saket', date: '2026-06-09', slaBreached: true },
  { id: '5', ref: 'DEL-20260605-00019', title: 'Noise complaint from construction site', category: 'Law & Order', status: 'submitted', priority: 'low', dept: 'POLICE', ward: 'Lajpat Nagar', date: '2026-06-05', slaBreached: true },
];

export default function CitizenDashboard() {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? MOCK_COMPLAINTS : MOCK_COMPLAINTS.filter((c) => c.status === filter);

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '4px' }}>My Complaints</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Track and manage your submitted grievances</p>
        </div>
        <Link href="/dashboard/citizen/submit" className="btn btn-primary">✏️ New Complaint</Link>
      </div>

      {/* Quick stats */}
      <div className="stagger-children" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <div className="stat-card"><div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Total</div><div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{MOCK_COMPLAINTS.length}</div></div>
        <div className="stat-card success"><div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Resolved</div><div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#6ee7b7' }}>{MOCK_COMPLAINTS.filter((c) => c.status === 'resolved').length}</div></div>
        <div className="stat-card warning"><div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Active</div><div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fbbf24' }}>{MOCK_COMPLAINTS.filter((c) => ['submitted', 'assigned', 'in_progress'].includes(c.status)).length}</div></div>
        <div className="stat-card critical"><div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Awaiting Confirmation</div><div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#93c5fd' }}>{MOCK_COMPLAINTS.filter((c) => c.status === 'provisionally_resolved').length}</div></div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {['all', 'submitted', 'assigned', 'in_progress', 'provisionally_resolved', 'resolved'].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={filter === s ? 'btn btn-primary' : 'btn btn-ghost'} style={{ padding: '6px 14px', fontSize: '0.8rem', textTransform: 'capitalize' }}>
            {s === 'all' ? 'All' : s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Complaints list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filtered.map((complaint) => (
          <div key={complaint.id} className="glass-card" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary-light)'; e.currentTarget.style.transform = 'translateX(4px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.transform = 'none'; }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                <span className={`badge badge-${complaint.status}`} style={{ textTransform: 'capitalize' }}>{complaint.status.replace(/_/g, ' ')}</span>
                <span className={`badge badge-${complaint.priority}`}>{complaint.priority}</span>
                {complaint.slaBreached && <span className="badge badge-critical">SLA ❌</span>}
              </div>
              <h3 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '4px' }}>{complaint.title}</h3>
              <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span>📋 {complaint.ref}</span>
                <span>📁 {complaint.category}</span>
                <span>🏢 {complaint.dept}</span>
                <span>📍 {complaint.ward}</span>
                <span>📅 {complaint.date}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {complaint.status === 'provisionally_resolved' && (
                <>
                  <button className="btn btn-success" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>✅ Confirm</button>
                  <button className="btn btn-danger" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>❌ Reject</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
