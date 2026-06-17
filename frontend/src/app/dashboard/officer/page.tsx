'use client';

import { useState } from 'react';

const COLUMNS = [
  { key: 'submitted', label: 'Submitted', color: '#94a3b8', icon: '📥' },
  { key: 'assigned', label: 'Assigned', color: '#3b82f6', icon: '👤' },
  { key: 'in_progress', label: 'In Progress', color: '#f59e0b', icon: '🔧' },
  { key: 'provisionally_resolved', label: 'Prov. Resolved', color: '#06b6d4', icon: '⏳' },
  { key: 'escalated', label: 'Escalated', color: '#8b5cf6', icon: '⬆️' },
];

const MOCK_TICKETS: Record<string, Array<{ id: string; ref: string; title: string; priority: string; ward: string; time: string; sla: boolean }>> = {
  submitted: [
    { id: '1', ref: 'DEL-00012', title: 'Broken pavement near metro', priority: 'normal', ward: 'Karol Bagh', time: '2h ago', sla: false },
    { id: '2', ref: 'DEL-00015', title: 'Water contamination report', priority: 'high', ward: 'Rohini', time: '4h ago', sla: false },
  ],
  assigned: [
    { id: '3', ref: 'DEL-00009', title: 'Garbage pile at market', priority: 'normal', ward: 'Dwarka', time: '1d ago', sla: false },
    { id: '4', ref: 'DEL-00011', title: 'Streetlight malfunction', priority: 'low', ward: 'Saket', time: '6h ago', sla: false },
    { id: '5', ref: 'DEL-00016', title: 'Open drain near school', priority: 'critical', ward: 'Pitampura', time: '3h ago', sla: true },
  ],
  in_progress: [
    { id: '6', ref: 'DEL-00007', title: 'Deep pothole on NH-24', priority: 'high', ward: 'Lajpat Nagar', time: '2d ago', sla: true },
    { id: '7', ref: 'DEL-00003', title: 'Sewer overflow complaint', priority: 'critical', ward: 'Chandni Chowk', time: '3d ago', sla: true },
  ],
  provisionally_resolved: [
    { id: '8', ref: 'DEL-00001', title: 'Pipe leak fixed', priority: 'normal', ward: 'Vasant Kunj', time: '5d ago', sla: false },
  ],
  escalated: [
    { id: '9', ref: 'DEL-00005', title: 'Live wire near playground', priority: 'critical', ward: 'Janakpuri', time: '1d ago', sla: true },
  ],
};

export default function OfficerDashboard() {
  const [selected, setSelected] = useState<string | null>(null);

  const totalTickets = Object.values(MOCK_TICKETS).reduce((a, b) => a + b.length, 0);
  const slaBreached = Object.values(MOCK_TICKETS).flat().filter((t) => t.sla).length;

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '4px' }}>Kanban Board</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {totalTickets} tickets • {slaBreached} SLA breaches
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-ghost" style={{ fontSize: '0.8rem' }}>🔄 Refresh</button>
        </div>
      </div>

      {/* Kanban columns */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${COLUMNS.length}, 1fr)`, gap: '12px', overflowX: 'auto' }}>
        {COLUMNS.map((col) => (
          <div key={col.key} style={{ minWidth: '220px' }}>
            {/* Column header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 12px', marginBottom: '8px', borderRadius: '10px',
              background: 'var(--bg-secondary)', borderBottom: `3px solid ${col.color}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{col.icon}</span>
                <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{col.label}</span>
              </div>
              <span style={{
                padding: '2px 8px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700,
                background: `${col.color}22`, color: col.color,
              }}>
                {MOCK_TICKETS[col.key]?.length || 0}
              </span>
            </div>

            {/* Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(MOCK_TICKETS[col.key] || []).map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => setSelected(ticket.id === selected ? null : ticket.id)}
                  style={{
                    padding: '14px', borderRadius: '10px',
                    background: selected === ticket.id ? 'var(--bg-card-hover)' : 'var(--bg-card)',
                    border: `1px solid ${selected === ticket.id ? col.color + '66' : 'var(--border-color)'}`,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{ticket.ref}</span>
                    {ticket.sla && <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(239,68,68,0.15)', color: '#fca5a5' }}>SLA ❌</span>}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '8px', lineHeight: 1.3 }}>{ticket.title}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className={`badge badge-${ticket.priority}`} style={{ fontSize: '0.65rem', padding: '2px 8px' }}>{ticket.priority}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>📍 {ticket.ward}</span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '6px' }}>🕐 {ticket.time}</div>

                  {/* Expanded actions */}
                  {selected === ticket.id && (
                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {col.key === 'submitted' && <button className="btn btn-primary" style={{ fontSize: '0.7rem', padding: '4px 10px' }}>Accept</button>}
                      {col.key === 'in_progress' && <button className="btn btn-success" style={{ fontSize: '0.7rem', padding: '4px 10px' }}>Upload Evidence</button>}
                      <button className="btn btn-ghost" style={{ fontSize: '0.7rem', padding: '4px 10px' }}>Add Note</button>
                      <button className="btn btn-ghost" style={{ fontSize: '0.7rem', padding: '4px 10px' }}>View Details</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
