'use client';

import { useState } from 'react';

const CATEGORIES = [
  { value: 'Water Supply', subs: ['Pipe Burst', 'Contamination', 'Low Pressure', 'No Supply'] },
  { value: 'Roads', subs: ['Pothole', 'Broken Pavement', 'Waterlogging', 'Damaged Divider'] },
  { value: 'Sanitation', subs: ['Garbage Pile', 'Sewer Overflow', 'Open Drain', 'Street Cleaning'] },
  { value: 'Electricity', subs: ['Power Outage', 'Streetlight', 'Dangling Wire', 'Transformer Issue'] },
  { value: 'Law & Order', subs: ['Illegal Encroachment', 'Noise Complaint', 'Suspicious Activity', 'Traffic Violation'] },
];

const WARDS = ['Karol Bagh', 'Rohini', 'Dwarka', 'Saket', 'Lajpat Nagar', 'Chandni Chowk', 'Connaught Place', 'Vasant Kunj', 'Janakpuri', 'Pitampura'];

export default function SubmitComplaint() {
  const [form, setForm] = useState({ title: '', description: '', category: '', subcategory: '', ward: '', landmark: '', pincode: '' });
  const [submitted, setSubmitted] = useState(false);
  const [refNum, setRefNum] = useState('');
  const [locating, setLocating] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const selectedCat = CATEGORIES.find((c) => c.value === form.category);

  const getLocation = () => {
    setLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); },
        () => { setCoords({ lat: 28.6139, lng: 77.2090 }); setLocating(false); },
      );
    } else { setCoords({ lat: 28.6139, lng: 77.2090 }); setLocating(false); }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ref = `DEL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`;
    setRefNum(ref);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', paddingTop: '60px' }}>
        <div style={{ fontSize: '4rem', marginBottom: '16px' }}>✅</div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '8px' }}>Complaint Registered</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Your complaint has been submitted and will be routed to the appropriate department.</p>
        <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>REFERENCE NUMBER</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#93c5fd', letterSpacing: '0.05em' }}>{refNum}</div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px' }}>Save this number to track your complaint status.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <a href="/dashboard/citizen" className="btn btn-primary">View My Complaints</a>
          <a href={`/track?ref=${refNum}`} className="btn btn-ghost">Track Complaint</a>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '4px' }}>Submit a Complaint</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '28px' }}>Report a civic issue for government action</p>

      <form onSubmit={handleSubmit} style={{ maxWidth: '700px' }}>
        <div className="glass-card" style={{ padding: '28px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '20px' }}>📝 Issue Details</h3>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Title *</label>
            <input className="input" required placeholder="Brief description of the issue" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Description *</label>
            <textarea className="input" required rows={4} placeholder="Provide details about the issue, including duration and impact..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ resize: 'vertical' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Category *</label>
              <select className="input" required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value, subcategory: '' })}>
                <option value="">Select category</option>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.value}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Sub-category</label>
              <select className="input" value={form.subcategory} onChange={(e) => setForm({ ...form, subcategory: e.target.value })} disabled={!selectedCat}>
                <option value="">Select sub-category</option>
                {selectedCat?.subs.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '28px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '20px' }}>📍 Location</h3>
          <button type="button" className="btn btn-ghost" style={{ marginBottom: '16px', width: '100%' }} onClick={getLocation} disabled={locating}>
            {locating ? '📡 Detecting location...' : coords ? `📍 Location: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : '📡 Detect My Location'}
          </button>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Ward</label>
              <select className="input" value={form.ward} onChange={(e) => setForm({ ...form, ward: e.target.value })}>
                <option value="">Select ward</option>
                {WARDS.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Pincode</label>
              <input className="input" placeholder="110001" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Landmark</label>
            <input className="input" placeholder="Near XYZ school / market" value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} />
          </div>
        </div>

        <div className="glass-card" style={{ padding: '28px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '20px' }}>📎 Evidence (Optional)</h3>
          <div style={{
            border: '2px dashed var(--border-color)', borderRadius: '12px', padding: '40px', textAlign: 'center',
            color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📷</div>
            <p style={{ fontSize: '0.9rem' }}>Drag & drop photos or videos here</p>
            <p style={{ fontSize: '0.75rem', marginTop: '4px' }}>Max 5 files, 10MB each • JPG, PNG, MP4</p>
          </div>
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '16px', fontSize: '1rem' }}>
          🚀 Submit Complaint
        </button>
      </form>
    </div>
  );
}
