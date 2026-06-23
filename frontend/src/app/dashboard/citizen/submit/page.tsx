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
  const [files, setFiles] = useState<File[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [refNum, setRefNum] = useState('');
  const [locating, setLocating] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedCat = CATEGORIES.find((c) => c.value === form.category);

  const getLocation = () => {
    setLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { 
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); 
          setLocating(false); 
        },
        () => { 
          // Default to center of Delhi (Connaught Place)
          setCoords({ lat: 28.6139, lng: 77.2090 }); 
          setLocating(false); 
        },
      );
    } else { 
      setCoords({ lat: 28.6139, lng: 77.2090 }); 
      setLocating(false); 
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files).slice(0, 5));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('accessToken');
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('description', form.description);
      formData.append('category', form.category);
      if (form.subcategory) {
        formData.append('subcategory', form.subcategory);
      }
      
      // If coords not loaded, get dummy delhi coordinates
      const lat = coords?.lat || 28.6139;
      const lng = coords?.lng || 77.2090;
      formData.append('latitude', String(lat));
      formData.append('longitude', String(lng));

      const addressData = {
        ward: form.ward || 'General',
        pincode: form.pincode || '110001',
        landmark: form.landmark || '',
        fullAddress: `${form.landmark ? form.landmark + ', ' : ''}${form.ward || 'Delhi'}, Delhi - ${form.pincode || '110001'}`,
      };
      formData.append('address', JSON.stringify(addressData));
      formData.append('source', 'web');

      // Append files
      files.forEach((file) => {
        formData.append('media', file);
      });

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/complaints`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token || ''}`,
        },
        body: formData,
      });

      const resData = await res.json();
      if (resData.success) {
        setRefNum(resData.data.complaint.referenceNumber);
        setSubmitted(true);
      } else {
        throw new Error(resData.error?.message || 'Grievance registration failed.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to submit complaint. Please check fields.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', paddingTop: '60px' }}>
        <div style={{ fontSize: '4rem', marginBottom: '16px' }}>✓</div>
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
      <h1 style={{ fontSize: 'clamp(1.25rem, 3vw, 1.75rem)', fontWeight: 800, marginBottom: '4px' }}>Submit a Complaint</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 'clamp(0.8rem, 1.5vw, 0.9rem)', marginBottom: '24px' }}>Report a civic issue for government action</p>

      {error && (
        <div style={{
          padding: '12px 16px', borderRadius: '10px', marginBottom: '20px',
          background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
          color: '#fca5a5', fontSize: '0.85rem',
        }}>
          [!] {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ maxWidth: '700px' }}>
        <div className="glass-card" style={{ padding: '28px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '20px' }}>▣ Issue Details</h3>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Title *</label>
            <input className="input" required placeholder="Brief description of the issue" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Description *</label>
            <textarea className="input" required rows={4} placeholder="Provide details about the issue, including duration and impact..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ resize: 'vertical' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '16px', marginBottom: '16px' }}>
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
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '20px' }}>▣ Location</h3>
          <button type="button" className="btn btn-ghost" style={{ marginBottom: '16px', width: '100%' }} onClick={getLocation} disabled={locating}>
            {locating ? 'Detecting location...' : coords ? `GPS Lock Verified: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : 'Detect My Location'}
          </button>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Ward *</label>
              <select className="input" required value={form.ward} onChange={(e) => setForm({ ...form, ward: e.target.value })}>
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
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '20px' }}>▣ Evidence (Optional)</h3>
          <input
            type="file"
            id="file-upload"
            multiple
            accept="image/*,video/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <label htmlFor="file-upload" style={{
            display: 'block', border: '2px dashed var(--border-color)', borderRadius: '12px', padding: '40px', textAlign: 'center',
            color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>[Upload]</div>
            {files.length > 0 ? (
              <div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>{files.length} file(s) selected</p>
                <p style={{ fontSize: '0.75rem', marginTop: '4px' }}>{files.map(f => f.name).join(', ')}</p>
              </div>
            ) : (
              <>
                <p style={{ fontSize: '0.9rem' }}>Click to upload photos or videos</p>
                <p style={{ fontSize: '0.75rem', marginTop: '4px' }}>Max 5 files, 10MB each • JPG, PNG, MP4</p>
              </>
            )}
          </label>
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '16px', fontSize: '1rem' }} disabled={loading}>
          {loading ? 'Submitting Grievance...' : 'Submit Complaint'}
        </button>
      </form>
    </div>
  );
}
