'use client';

import { useState } from 'react';
import Link from 'next/link';

const MOCK_TIMELINE = [
  { action: 'Complaint Submitted', status: 'submitted', date: '2026-06-15 09:32 AM', by: 'Rohit Kumar' },
  { action: 'Auto-classified & Routed', status: 'classified', date: '2026-06-15 09:33 AM', by: 'System' },
  { action: 'Assigned to Officer', status: 'assigned', date: '2026-06-15 10:15 AM', by: 'System' },
  { action: 'Work in Progress', status: 'in_progress', date: '2026-06-15 02:40 PM', by: 'Rajesh Verma' },
  { action: 'Resolution Evidence Uploaded', status: 'evidence', date: '2026-06-16 11:20 AM', by: 'Rajesh Verma' },
  { action: 'Provisionally Resolved', status: 'provisionally_resolved', date: '2026-06-16 11:21 AM', by: 'System' },
];

export default function TrackPage() {
  const [refNum, setRefNum] = useState('');
  const [searched, setSearched] = useState(false);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '2rem' }}>
      <nav style={{ maxWidth: '800px', margin: '0 auto 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'var(--text-primary)' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, color: 'white' }}>D</div>
          <span style={{ fontWeight: 700 }}>Delhi CM Grievance</span>
        </Link>
        <Link href="/login" className="btn btn-ghost" style={{ fontSize: '0.85rem' }}>Login</Link>
      </nav>

      <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, textAlign: 'center', marginBottom: '8px' }}>🔍 Track Your Complaint</h1>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '32px' }}>Enter your reference number to see real-time status</p>

        <div className="glass-card" style={{ padding: '24px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input className="input" style={{ flex: 1, fontSize: '1.1rem', padding: '14px 16px' }} placeholder="DEL-20260615-00023" value={refNum} onChange={(e) => setRefNum(e.target.value)} />
            <button className="btn btn-primary" style={{ padding: '14px 28px' }} onClick={() => setSearched(true)} disabled={!refNum}>Track →</button>
          </div>
        </div>

        {searched && (
          <div className="animate-fade-in">
            {/* Complaint summary */}
            <div className="glass-card" style={{ padding: '28px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{refNum || 'DEL-20260615-00023'}</div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>Pipe burst on main road causing waterlogging</h2>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span className="badge badge-in_progress">Provisionally Resolved</span>
                    <span className="badge badge-high">High Priority</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginTop: '16px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '10px' }}>
                <div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '2px' }}>CATEGORY</div><div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Water Supply</div></div>
                <div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '2px' }}>DEPARTMENT</div><div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Delhi Jal Board</div></div>
                <div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '2px' }}>WARD</div><div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Karol Bagh</div></div>
                <div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '2px' }}>SLA DEADLINE</div><div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fbbf24' }}>Jun 16, 9:32 AM</div></div>
              </div>
            </div>

            {/* Timeline */}
            <div className="glass-card" style={{ padding: '28px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '24px' }}>📋 Resolution Timeline</h3>
              <div style={{ position: 'relative', paddingLeft: '28px' }}>
                <div style={{ position: 'absolute', left: '10px', top: '8px', bottom: '8px', width: '2px', background: 'var(--border-color)' }} />
                {MOCK_TIMELINE.map((item, i) => (
                  <div key={i} style={{ position: 'relative', paddingBottom: '24px' }}>
                    <div style={{
                      position: 'absolute', left: '-22px', top: '4px',
                      width: '12px', height: '12px', borderRadius: '50%',
                      background: i === MOCK_TIMELINE.length - 1 ? '#3b82f6' : '#10b981',
                      border: '2px solid var(--bg-primary)',
                    }} />
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '2px' }}>{item.action}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {item.date} • by {item.by}
                    </div>
                  </div>
                ))}
              </div>

              {/* Action buttons for citizen */}
              <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '10px', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  🔔 Your complaint has been marked as resolved. Please confirm if the issue is fixed:
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button className="btn btn-success" style={{ flex: 1 }}>✅ Yes, Issue Resolved</button>
                  <button className="btn btn-danger" style={{ flex: 1 }}>❌ No, Not Resolved</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
