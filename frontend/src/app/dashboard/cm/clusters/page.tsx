'use client';

import { useState, useEffect, useCallback } from 'react';

interface Cluster {
  _id: string;
  masterComplaintId?: {
    _id: string;
    referenceNumber?: string;
    title?: string;
    status?: string;
    priority?: string;
    assignedOfficer?: { name?: string };
    address?: { ward?: string; locality?: string };
  };
  category: string;
  location: { type: string; coordinates: [number, number] };
  complaintCount: number;
  severityScore: number;
  radius: number;
  status: string;
  subscriberComplaintIds: string[];
  createdAt: string;
  lastUpdated: string;
}

interface ClusterDetail {
  cluster: Cluster;
  complaints: Array<{
    _id: string;
    referenceNumber: string;
    title: string;
    status: string;
    priority: string;
    citizenId?: { name?: string };
    createdAt: string;
  }>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const statusColors: Record<string, string> = {
  submitted: '#94a3b8', assigned: '#3b82f6', in_progress: '#f59e0b',
  resolved: '#10b981', escalated: '#8b5cf6', closed: '#6b7280',
};

const categoryEmojis: Record<string, string> = {
  'Water Supply': '💧', 'Sewage & Drainage': '🚰', 'Roads & Footpaths': '🛣️',
  'Electricity': '⚡', 'Garbage & Sanitation': '🗑️', 'Street Lighting': '💡',
  'Public Safety': '🛡️', 'Parks & Recreation': '🌳', 'Traffic & Parking': '🚗',
  'Noise Pollution': '🔊',
};

export default function ClustersPage() {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [clustering, setClustering] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState<ClusterDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
  const headers = { 'Authorization': `Bearer ${token || ''}`, 'Content-Type': 'application/json' };

  const fetchClusters = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/v1/governance/clusters?page=${page}&limit=20`, { headers });
      const data = await res.json();
      if (data.success) {
        setClusters(data.data?.clusters || []);
        setMeta(data.data?.meta || { total: 0, page: 1, totalPages: 1 });
      }
    } catch (err) {
      console.error('Failed to fetch clusters:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchClusters(); }, [fetchClusters]);

  const triggerClustering = async () => {
    setClustering(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/governance/run-clustering`, { method: 'POST', headers });
      const data = await res.json();
      if (data.success) {
        await fetchClusters();
      }
    } catch (err) {
      console.error('Failed to run clustering:', err);
    } finally {
      setClustering(false);
    }
  };

  const viewClusterDetail = async (clusterId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/governance/clusters/${clusterId}`, { headers });
      const data = await res.json();
      if (data.success) setSelectedCluster(data.data);
    } catch (err) {
      console.error('Failed to fetch cluster detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  // Aggregate stats
  const totalComplaints = clusters.reduce((s, c) => s + c.complaintCount, 0);
  const avgSize = clusters.length > 0 ? (totalComplaints / clusters.length).toFixed(1) : '0';
  const byCategory = clusters.reduce((acc, c) => {
    acc[c.category] = (acc[c.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];

  if (loading && clusters.length === 0) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ height: '40px', width: '300px' }} className="skeleton" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {[1,2,3,4].map(i => <div key={i} style={{ height: '80px' }} className="skeleton" />)}
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
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '4px' }}>🔗 Master Incident Clusters</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>DBSCAN spatial clustering — same category within 50m radius</p>
        </div>
        <button onClick={triggerClustering} className="btn btn-primary" disabled={clustering}>
          {clustering ? '⏳ Running DBSCAN...' : '🔄 Run Clustering'}
        </button>
      </div>

      {/* Summary Stats */}
      <div className="stagger-children" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <div className="stat-card" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Active Clusters</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{meta.total}</div>
        </div>
        <div className="stat-card warning" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Total Complaints</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fbbf24' }}>{totalComplaints}</div>
        </div>
        <div className="stat-card" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Avg Cluster Size</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{avgSize}</div>
        </div>
        <div className="stat-card" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Top Category</div>
          <div style={{ fontSize: '1rem', fontWeight: 800 }}>{topCategory ? `${categoryEmojis[topCategory[0]] || '📌'} ${topCategory[0]}` : '—'}</div>
        </div>
      </div>

      {/* Clusters Grid */}
      {clusters.length === 0 ? (
        <div className="glass-card" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🔗</div>
          <p style={{ marginBottom: '12px' }}>No active clusters. Run the clustering algorithm to group nearby complaints.</p>
          <button onClick={triggerClustering} className="btn btn-primary">Run DBSCAN Now</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '16px' }}>
          {clusters.map(cluster => {
            const emoji = categoryEmojis[cluster.category] || '📌';
            const master = cluster.masterComplaintId;
            return (
              <div key={cluster._id} className="glass-card" style={{ padding: '20px', cursor: 'pointer', transition: 'all 0.2s' }}
                onClick={() => viewClusterDetail(cluster._id)}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--primary-light)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = ''; }}>

                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.8rem' }}>{emoji}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem' }}>{cluster.category}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{master?.address?.ward || master?.address?.locality || 'Delhi'}</div>
                    </div>
                  </div>
                  <div style={{
                    padding: '6px 14px', borderRadius: '999px', fontWeight: 800, fontSize: '1.1rem',
                    background: cluster.complaintCount >= 10 ? 'rgba(239, 68, 68, 0.15)' : cluster.complaintCount >= 5 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                    color: cluster.complaintCount >= 10 ? '#fca5a5' : cluster.complaintCount >= 5 ? '#fbbf24' : '#93c5fd',
                  }}>
                    {cluster.complaintCount}
                  </div>
                </div>

                {/* Master ticket info */}
                {master && (
                  <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-secondary)', marginBottom: '12px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Master Ticket</span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>{master.referenceNumber}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{master.title || 'Untitled'}</div>
                  </div>
                )}

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>👮 {master?.assignedOfficer?.name || 'Unassigned'}</span>
                  <span>📍 {cluster.location.coordinates[1].toFixed(4)}°N, {cluster.location.coordinates[0].toFixed(4)}°E</span>
                </div>

                {/* Subscriber count bar */}
                <div style={{ marginTop: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    <span>{cluster.complaintCount} complaints grouped</span>
                    <span>Radius: {cluster.radius}m</span>
                  </div>
                  <div style={{ height: '4px', borderRadius: '2px', background: 'var(--bg-secondary)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: '2px', transition: 'width 0.5s',
                      width: `${Math.min(cluster.complaintCount * 5, 100)}%`,
                      background: cluster.complaintCount >= 10 ? 'var(--gradient-danger)' : cluster.complaintCount >= 5 ? 'var(--gradient-accent)' : 'var(--gradient-primary)',
                    }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
          {Array.from({ length: meta.totalPages }, (_, i) => (
            <button key={i + 1} onClick={() => fetchClusters(i + 1)}
              className={meta.page === i + 1 ? 'btn btn-primary' : 'btn btn-ghost'}
              style={{ padding: '6px 12px', fontSize: '0.8rem', minWidth: '36px' }}>
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Cluster Detail Modal */}
      {selectedCluster && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }} onClick={() => setSelectedCluster(null)}>
          <div className="glass-card" style={{ padding: '32px', width: '700px', maxWidth: '90vw', maxHeight: '80vh', overflow: 'auto' }}
            onClick={e => e.stopPropagation()}>
            {detailLoading ? (
              <div style={{ height: '200px' }} className="skeleton" />
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>
                    {categoryEmojis[selectedCluster.cluster.category] || '📌'} {selectedCluster.cluster.category} Cluster
                  </h2>
                  <button onClick={() => setSelectedCluster(null)} className="btn btn-ghost" style={{ padding: '6px 10px' }}>✕</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                  <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--bg-secondary)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Complaints</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{selectedCluster.cluster.complaintCount}</div>
                  </div>
                  <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--bg-secondary)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Radius</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{selectedCluster.cluster.radius}m</div>
                  </div>
                  <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--bg-secondary)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Location</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                      {selectedCluster.cluster.location.coordinates[1].toFixed(4)}°N
                    </div>
                  </div>
                </div>

                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '12px', color: 'var(--text-secondary)' }}>Linked Complaints</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedCluster.complaints.map(c => (
                    <div key={c._id} style={{
                      padding: '12px 14px', borderRadius: '10px', background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{c.referenceNumber}</span>
                          <span style={{
                            padding: '2px 8px', borderRadius: '999px', fontSize: '0.65rem', fontWeight: 600,
                            background: `${statusColors[c.status] || '#94a3b8'}20`,
                            color: statusColors[c.status] || '#94a3b8',
                          }}>
                            {c.status?.replace('_', ' ')}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{c.title}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {c.citizenId?.name || 'Anonymous'}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {new Date(c.createdAt).toLocaleDateString('en-IN')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
