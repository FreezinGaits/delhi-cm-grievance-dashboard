'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

const COLUMNS = [
  { key: 'submitted', label: 'Submitted', color: '#94a3b8', icon: '📥' },
  { key: 'assigned', label: 'Assigned', color: '#3b82f6', icon: '👤' },
  { key: 'in_progress', label: 'In Progress', color: '#f59e0b', icon: '🔧' },
  { key: 'provisionally_resolved', label: 'Prov. Resolved', color: '#06b6d4', icon: '⏳' },
  { key: 'escalated', label: 'Escalated', color: '#8b5cf6', icon: '⬆️' },
];

export default function OfficerDashboard() {
  const pathname = usePathname() || '';
  const activeTab = pathname.endsWith('/complaints') ? 'complaints' : 'kanban';

  const [columnsData, setColumnsData] = useState<Record<string, any[]>>({});
  const [metrics, setMetrics] = useState<any>({
    totalAssigned: 0,
    resolvedCount: 0,
    slaBreaches: 0,
    pendingCount: 0,
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modals / Input states
  const [noteText, setNoteText] = useState('');
  const [evidenceText, setEvidenceText] = useState('');
  const [showNoteModal, setShowNoteModal] = useState<string | null>(null);
  const [showEvidenceModal, setShowEvidenceModal] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Complaints search & filters
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const fetchKanbanData = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/officers/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'Content-Type': 'application/json',
        },
      });

      const resData = await res.json();
      if (resData.success) {
        setColumnsData(resData.data.columns || {});
        setMetrics(resData.data.metrics || {});
      } else {
        throw new Error(resData.error?.message || 'Failed to retrieve dashboard data');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Connection to Officer Dashboard API failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKanbanData();
  }, []);

  const handleAccept = async (ticketId: string) => {
    try {
      setActionLoading(true);
      setError('');
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/officers/complaints/${ticketId}/accept`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'Content-Type': 'application/json',
        },
      });

      const resData = await res.json();
      if (resData.success) {
        setSelected(null);
        await fetchKanbanData();
      } else {
        throw new Error(resData.error?.message || 'Failed to accept ticket');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showNoteModal || !noteText.trim()) return;
    try {
      setActionLoading(true);
      setError('');
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/officers/complaints/${showNoteModal}/notes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ note: noteText }),
      });

      const resData = await res.json();
      if (resData.success) {
        setNoteText('');
        setShowNoteModal(null);
        alert('Note added successfully.');
        await fetchKanbanData();
      } else {
        throw new Error(resData.error?.message || 'Failed to add note');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUploadEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEvidenceModal || !evidenceText.trim()) return;
    try {
      setActionLoading(true);
      setError('');
      const token = localStorage.getItem('accessToken');
      
      // Grab coordinates from the ticket itself to pass GPS lock verification
      const ticket = showEvidenceModal;
      const gpsLng = ticket.location?.coordinates?.[0];
      const gpsLat = ticket.location?.coordinates?.[1];

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/officers/complaints/${ticket._id}/evidence`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: evidenceText,
          gpsLat,
          gpsLng,
        }),
      });

      const resData = await res.json();
      if (resData.success) {
        setEvidenceText('');
        setShowEvidenceModal(null);
        setSelected(null);
        alert(resData.data.message || 'Evidence submitted!');
        await fetchKanbanData();
      } else {
        throw new Error(resData.error?.message || 'Failed to submit evidence');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && Object.keys(columnsData).length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ height: '40px', width: '250px' }} className="skeleton" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ height: '400px' }} className="skeleton" />
          ))}
        </div>
      </div>
    );
  }

  // Get flat list of all complaints across columns
  const allTickets = Object.values(columnsData).flat();

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '4px' }}>
            {activeTab === 'kanban' ? 'Kanban Board' : 'My Complaints'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {metrics.totalAssigned || 0} tickets • {metrics.slaBreaches || 0} SLA breaches
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={fetchKanbanData} className="btn btn-ghost" style={{ fontSize: '0.8rem' }}>
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

      {activeTab === 'kanban' && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${COLUMNS.length}, 1fr)`, gap: '12px', overflowX: 'auto', paddingBottom: '20px' }}>
          {COLUMNS.map((col) => {
            const tickets = columnsData[col.key] || [];
            return (
              <div key={col.key} style={{ minWidth: '240px', background: 'rgba(15, 23, 42, 0.2)', padding: '10px', borderRadius: '12px' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', marginBottom: '12px', borderRadius: '10px',
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
                    {tickets.length}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '300px' }}>
                  {tickets.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100px', border: '1px dashed var(--border-color)', borderRadius: '10px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      Empty Column
                    </div>
                  ) : (
                    tickets.map((ticket) => {
                      const priorityClass = `badge-${ticket.priority || 'normal'}`;
                      const isSlaBreached = ticket.sla?.breached;
                      const wardName = ticket.address?.ward || 'Unknown Ward';
                      return (
                        <div
                          key={ticket._id}
                          onClick={() => setSelected(ticket._id === selected ? null : ticket._id)}
                          style={{
                            padding: '14px', borderRadius: '10px',
                            background: selected === ticket._id ? 'var(--bg-card-hover)' : 'var(--bg-card)',
                            border: `1px solid ${selected === ticket._id ? col.color + '66' : 'var(--border-color)'}`,
                            cursor: 'pointer', transition: 'all 0.15s',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{ticket.referenceNumber}</span>
                            {isSlaBreached && <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(239,68,68,0.15)', color: '#fca5a5' }}>SLA ❌</span>}
                          </div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '8px', lineHeight: 1.3 }}>{ticket.title}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className={`badge ${priorityClass}`} style={{ fontSize: '0.65rem', padding: '2px 8px' }}>{ticket.priority}</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>📍 {wardName}</span>
                          </div>

                          {selected === ticket._id && (
                            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '6px', flexWrap: 'wrap' }} onClick={(e) => e.stopPropagation()}>
                              {(col.key === 'submitted' || col.key === 'assigned') && (
                                <button disabled={actionLoading} onClick={() => handleAccept(ticket._id)} className="btn btn-primary" style={{ fontSize: '0.7rem', padding: '6px 12px' }}>
                                  {actionLoading ? 'Accepting...' : 'Accept Ticket'}
                                </button>
                              )}
                              {col.key === 'in_progress' && (
                                <button onClick={() => setShowEvidenceModal(ticket)} className="btn btn-success" style={{ fontSize: '0.7rem', padding: '6px 12px' }}>
                                  Mark Resolved
                                </button>
                              )}
                              <button onClick={() => setShowNoteModal(ticket._id)} className="btn btn-ghost" style={{ fontSize: '0.7rem', padding: '6px 12px' }}>
                                Add Note
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'complaints' && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>📝 Detailed Tasks Ledger</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                className="input"
                style={{ padding: '8px 12px', fontSize: '0.8rem', width: '220px' }}
                placeholder="Search Reference, title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <select className="input" style={{ padding: '8px', fontSize: '0.8rem' }} value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                <option value="all">All Priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="normal">Normal</option>
              </select>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  {['Reference', 'Title', 'Category', 'Status', 'Priority', 'Ward', 'Date'].map(h => (
                    <th key={h} style={{ padding: '10px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allTickets
                  .filter(c => {
                    const matchesSearch = c.referenceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) || c.title?.toLowerCase().includes(searchQuery.toLowerCase());
                    const matchesPriority = priorityFilter === 'all' || c.priority === priorityFilter;
                    return matchesSearch && matchesPriority;
                  })
                  .map(c => (
                    <tr key={c._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 10px', fontWeight: 600 }}>{c.referenceNumber}</td>
                      <td style={{ padding: '12px 10px' }}>{c.title}</td>
                      <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>{c.category}</td>
                      <td style={{ padding: '12px 10px' }}>
                        <span className={`badge badge-${c.status}`} style={{ textTransform: 'capitalize', fontSize: '0.7rem' }}>
                          {c.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <span className={`badge badge-${c.priority}`} style={{ fontSize: '0.7rem' }}>{c.priority}</span>
                      </td>
                      <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>
                        {c.address?.ward || 'General'}
                      </td>
                      <td style={{ padding: '12px 10px', color: 'var(--text-muted)' }}>
                        {new Date(c.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Note Modal */}
      {showNoteModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)',
        }}>
          <div className="glass-card" style={{ width: '90%', maxWidth: '400px', padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Add Internal Note</h3>
            <form onSubmit={handleAddNote}>
              <textarea
                className="input"
                style={{ minHeight: '100px', marginBottom: '16px', resize: 'vertical' }}
                placeholder="Enter internal progress details or updates..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                required
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-ghost" onClick={() => { setShowNoteModal(null); setNoteText(''); }} disabled={actionLoading}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading || !noteText.trim()}>
                  {actionLoading ? 'Saving...' : 'Add Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Evidence Modal */}
      {showEvidenceModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)',
        }}>
          <div className="glass-card" style={{ width: '90%', maxWidth: '440px', padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>Submit Resolution Evidence</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '16px' }}>
              Note: This action automatically transmits a simulated GPS lock from the site ({showEvidenceModal.location?.coordinates?.[1]}, {showEvidenceModal.location?.coordinates?.[0]}) to satisfy compliance verification.
            </p>
            <form onSubmit={handleUploadEvidence}>
              <textarea
                className="input"
                style={{ minHeight: '80px', marginBottom: '16px', resize: 'vertical' }}
                placeholder="Describe action taken to resolve this grievance..."
                value={evidenceText}
                onChange={(e) => setEvidenceText(e.target.value)}
                required
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-ghost" onClick={() => { setShowEvidenceModal(null); setEvidenceText(''); }} disabled={actionLoading}>Cancel</button>
                <button type="submit" className="btn btn-success" disabled={actionLoading || !evidenceText.trim()}>
                  {actionLoading ? 'Submitting...' : 'Resolve Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
