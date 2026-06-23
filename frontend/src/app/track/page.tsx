'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function TrackPage() {
  const [refNum, setRefNum] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [dashboardUrl, setDashboardUrl] = useState('/dashboard');

  const fetchTrackData = async (reference: string) => {
    if (!reference.trim()) return;
    try {
      setLoading(true);
      setError('');
      setResult(null);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/complaints/track/${reference}`);
      const resData = await res.json();
      
      if (resData.success) {
        setResult(resData.data);
      } else {
        throw new Error(resData.error?.message || 'Complaint not found. Check the reference number.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error tracking complaint.');
    } finally {
      setLoading(false);
    }
  };

  // Check URL query parameters and logged in status on load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsLoggedIn(!!localStorage.getItem('accessToken'));
      
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const userObj = JSON.parse(storedUser);
          const role = userObj.role;
          if (role === 'cm') {
            setDashboardUrl('/dashboard/cm');
          } else if (role === 'officer' || role === 'department_head') {
            setDashboardUrl('/dashboard/officer');
          } else if (role === 'admin') {
            setDashboardUrl('/dashboard/admin');
          } else {
            setDashboardUrl('/dashboard/citizen');
          }
        } catch (e) {
          setDashboardUrl('/dashboard/citizen');
        }
      }

      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref') || params.get('refNum');
      if (ref) {
        setRefNum(ref);
        fetchTrackData(ref);
      }
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTrackData(refNum);
  };

  const getActionName = (action: string) => {
    return action.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: 'clamp(1rem, 3vw, 2rem)' }}>
      <nav style={{ maxWidth: '800px', margin: '0 auto 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'var(--text-primary)' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, color: 'white' }}>D</div>
          <span style={{ fontWeight: 700 }}>Delhi CM Grievance</span>
        </Link>
        {isLoggedIn ? (
          <Link href={dashboardUrl} className="btn btn-ghost" style={{ fontSize: '0.85rem' }}>Dashboard</Link>
        ) : (
          <Link href="/login" className="btn btn-ghost" style={{ fontSize: '0.85rem' }}>Login</Link>
        )}
      </nav>

      <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: 'clamp(1.4rem, 4vw, 2rem)', fontWeight: 800, textAlign: 'center', marginBottom: '8px' }}>◎ Track Your Complaint</h1>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '28px', fontSize: 'clamp(0.8rem, 1.5vw, 1rem)' }}>Enter your reference number to see real-time status</p>

        <form onSubmit={handleSearch} className="glass-card" style={{ padding: '24px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <input 
              className="input" 
              style={{ flex: 1, fontSize: '1.1rem', padding: '14px 16px' }} 
              placeholder="DEL-YYYYMMDD-XXXXX" 
              value={refNum} 
              onChange={(e) => setRefNum(e.target.value)} 
              required
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '14px 28px' }} disabled={loading || !refNum}>
              {loading ? 'Searching...' : 'Track →'}
            </button>
          </div>
        </form>

        {error && (
          <div style={{
            padding: '16px', borderRadius: '12px', marginBottom: '24px',
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#fca5a5', fontSize: '0.9rem', textAlign: 'center'
          }}>
            [!] {error}
          </div>
        )}

        {result && (
          <div className="animate-fade-in">
            {/* Complaint summary */}
            <div className="glass-card" style={{ padding: '28px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{result.complaint.referenceNumber}</div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>{result.complaint.title}</h2>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span className={`badge badge-${result.complaint.status}`} style={{ textTransform: 'capitalize' }}>
                      {result.complaint.status.replace(/_/g, ' ')}
                    </span>
                    <span className={`badge badge-${result.complaint.priority}`}>{result.complaint.priority} Priority</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '16px', marginTop: '16px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '10px' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '2px' }}>CATEGORY</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{result.complaint.category}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '2px' }}>DEPARTMENT</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{result.complaint.assignedDepartment?.name || 'Pending routing'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '2px' }}>SUBMITTED</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                    {new Date(result.complaint.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '2px' }}>SLA DEADLINE</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fbbf24' }}>
                    {result.complaint.sla?.deadline ? new Date(result.complaint.sla.deadline).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="glass-card" style={{ padding: '28px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '24px' }}>▣ Resolution Timeline</h3>
              {result.history?.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No progress timeline registered yet.</div>
              ) : (
                <div style={{ position: 'relative', paddingLeft: '28px' }}>
                  <div style={{ position: 'absolute', left: '10px', top: '8px', bottom: '8px', width: '2px', background: 'var(--border-color)' }} />
                  {result.history.map((item: any, i: number) => (
                    <div key={i} style={{ position: 'relative', paddingBottom: '24px' }}>
                      <div style={{
                        position: 'absolute', left: '-22px', top: '4px',
                        width: '12px', height: '12px', borderRadius: '50%',
                        background: i === result.history.length - 1 ? '#3b82f6' : '#10b981',
                        border: '2px solid var(--bg-primary)',
                      }} />
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '2px' }}>{getActionName(item.action)}</div>
                      {item.notes && <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>{item.notes}</div>}
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(item.createdAt).toLocaleString('en-IN', { hour12: true, month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Action notice for citizen */}
              {result.complaint.status === 'provisionally_resolved' && (
                <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '10px', border: '1px solid rgba(59, 130, 246, 0.1)', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    [i] This complaint has been marked as Provisionally Resolved.
                  </p>
                  <Link href="/login" className="btn btn-primary" style={{ display: 'inline-block', fontSize: '0.85rem', padding: '10px 20px' }}>
                    Log in as Citizen to confirm resolution
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
