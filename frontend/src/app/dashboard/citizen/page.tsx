'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CitizenDashboard() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  // Confirmation/Rejection state
  const [showConfirmModal, setShowConfirmModal] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  
  const fetchComplaints = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/complaints`, {
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'Content-Type': 'application/json',
        },
      });

      const resData = await res.json();
      if (resData.success) {
        setComplaints(resData.data || []);
      } else {
        throw new Error(resData.error?.message || 'Failed to retrieve complaints');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Connection to Grievance API failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showConfirmModal) return;
    try {
      setActionLoading(true);
      setError('');
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/complaints/${showConfirmModal}/confirm`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rating, comment }),
      });

      const resData = await res.json();
      if (resData.success) {
        setShowConfirmModal(null);
        setComment('');
        setRating(5);
        alert('Resolution confirmed. Thank you for your feedback!');
        await fetchComplaints();
      } else {
        throw new Error(resData.error?.message || 'Failed to confirm resolution');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showRejectModal || !rejectReason.trim()) return;
    try {
      setActionLoading(true);
      setError('');
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/complaints/${showRejectModal}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: rejectReason }),
      });

      const resData = await res.json();
      if (resData.success) {
        setShowRejectModal(null);
        setRejectReason('');
        alert('Resolution rejected. Complaint has been escalated for review.');
        await fetchComplaints();
      } else {
        throw new Error(resData.error?.message || 'Failed to reject resolution');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = filter === 'all' ? complaints : complaints.filter((c) => c.status === filter);

  if (loading && complaints.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ height: '40px', width: '250px' }} className="skeleton" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '16px' }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ height: '80px' }} className="skeleton" />
          ))}
        </div>
        <div style={{ height: '300px' }} className="skeleton" />
      </div>
    );
  }

  // Calculate stats
  const total = complaints.length;
  const resolved = complaints.filter((c) => c.status === 'resolved').length;
  const active = complaints.filter((c) => ['submitted', 'assigned', 'in_progress', 'escalated'].includes(c.status)).length;
  const awaiting = complaints.filter((c) => c.status === 'provisionally_resolved').length;

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 'clamp(1.25rem, 3vw, 1.75rem)', fontWeight: 800, marginBottom: '4px' }}>My Complaints</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 'clamp(0.75rem, 1.5vw, 0.9rem)' }}>Track and manage your submitted grievances</p>
        </div>
        <Link href="/dashboard/citizen/submit" className="btn btn-primary" style={{ flexShrink: 0 }}>✏️ New Complaint</Link>
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

      {/* Quick stats */}
      <div className="stagger-children" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '12px', marginBottom: '24px' }}>
        <div className="stat-card">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Total</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{total}</div>
        </div>
        <div className="stat-card success">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Resolved</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#6ee7b7' }}>{resolved}</div>
        </div>
        <div className="stat-card warning">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Active</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fbbf24' }}>{active}</div>
        </div>
        <div className="stat-card critical">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Awaiting Confirmation</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#93c5fd' }}>{awaiting}</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {['all', 'submitted', 'assigned', 'in_progress', 'provisionally_resolved', 'resolved', 'escalated'].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={filter === s ? 'btn btn-primary' : 'btn btn-ghost'} style={{ padding: '6px 14px', fontSize: '0.8rem', textTransform: 'capitalize' }}>
            {s === 'all' ? 'All' : s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Complaints list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', border: '1px dashed var(--border-color)', borderRadius: '16px', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '2rem', marginBottom: '8px' }}>📂</span>
            <span style={{ fontSize: '0.9rem' }}>No grievances found.</span>
          </div>
        ) : (
          filtered.map((complaint) => {
            const isSlaBreached = complaint.sla?.breached;
            const deptCode = complaint.assignedDepartment?.code || 'Pending Route';
            const wardName = complaint.address?.ward || 'General';
            const createdDate = new Date(complaint.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });

            return (
              <div key={complaint._id} className="glass-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.15s' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                    <span className={`badge badge-${complaint.status}`} style={{ textTransform: 'capitalize' }}>{complaint.status.replace(/_/g, ' ')}</span>
                    <span className={`badge badge-${complaint.priority}`}>{complaint.priority}</span>
                    {isSlaBreached && <span className="badge badge-critical">SLA ❌</span>}
                  </div>
                  <h3 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '4px' }}>{complaint.title}</h3>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                    <span>📋 {complaint.referenceNumber}</span>
                    <span>📁 {complaint.category}</span>
                    <span>🏢 {deptCode}</span>
                    <span>📍 {wardName}</span>
                    <span>📅 {createdDate}</span>
                  </div>

                  {complaint.resolutionEvidence && (
                    <div style={{
                      marginTop: '12px',
                      padding: '12px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      fontSize: '0.85rem'
                    }}>
                      <div style={{ fontWeight: 600, marginBottom: '6px', color: '#6ee7b7' }}>🔍 Resolution Evidence:</div>
                      <div style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        <strong>Officer Notes:</strong> &ldquo;{complaint.resolutionEvidence.description || 'No notes provided.'}&rdquo;
                      </div>
                      {complaint.resolutionEvidence.media && complaint.resolutionEvidence.media.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                          {complaint.resolutionEvidence.media.map((mediaItem: any, idx: number) => {
                            const mediaUrl = mediaItem.url.startsWith('/') 
                              ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${mediaItem.url}`
                              : mediaItem.url;
                            return (
                              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img 
                                  src={mediaUrl} 
                                  alt="Resolution evidence photo" 
                                  style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '6px', border: '1px solid var(--border-color)' }} 
                                />
                                {mediaItem.metadata?.gpsLat && mediaItem.metadata?.gpsLng && (
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    📍 GPS Location: {mediaItem.metadata.gpsLat.toFixed(6)}, {mediaItem.metadata.gpsLng.toFixed(6)}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                  {complaint.status === 'provisionally_resolved' && (
                    <>
                      <button onClick={() => setShowConfirmModal(complaint._id)} className="btn btn-success" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>✅ Confirm</button>
                      <button onClick={() => setShowRejectModal(complaint._id)} className="btn btn-danger" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>❌ Reject</button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Confirm Resolution Modal */}
      {showConfirmModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)',
        }}>
          <div className="glass-card" style={{ width: '90%', maxWidth: '400px', padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '12px' }}>Confirm Resolution</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '16px' }}>
              We're glad to resolve your issue. Please rate your satisfaction and add comments.
            </p>
            <form onSubmit={handleConfirm}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 600 }}>Rating (1 - 5 Stars)</label>
                <div style={{ display: 'flex', gap: '8px', fontSize: '1.5rem' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      style={{ cursor: 'pointer', color: star <= rating ? '#fbbf24' : 'var(--text-muted)' }}
                      onClick={() => setRating(star)}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>
              <textarea
                className="input"
                style={{ minHeight: '80px', marginBottom: '16px', resize: 'vertical' }}
                placeholder="Share your feedback..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-ghost" onClick={() => { setShowConfirmModal(null); setComment(''); }} disabled={actionLoading}>Cancel</button>
                <button type="submit" className="btn btn-success" disabled={actionLoading}>
                  {actionLoading ? 'Saving...' : 'Confirm Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Resolution Modal */}
      {showRejectModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)',
        }}>
          <div className="glass-card" style={{ width: '90%', maxWidth: '400px', padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '12px' }}>Reject Resolution</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '16px' }}>
              Please specify the reasons why the resolution was unsatisfactory. The ticket will be immediately escalated.
            </p>
            <form onSubmit={handleReject}>
              <textarea
                className="input"
                style={{ minHeight: '100px', marginBottom: '16px', resize: 'vertical' }}
                placeholder="Reason for rejection..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                required
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-ghost" onClick={() => { setShowRejectModal(null); setRejectReason(''); }} disabled={actionLoading}>Cancel</button>
                <button type="submit" className="btn btn-danger" disabled={actionLoading || !rejectReason.trim()}>
                  {actionLoading ? 'Escalating...' : 'Reject & Escalate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
