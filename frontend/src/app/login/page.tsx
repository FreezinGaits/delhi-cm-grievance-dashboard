'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const [isOTP, setIsOTP] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || 'Login failed');
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      const role = data.data.user.role;
      if (role === 'cm') window.location.href = '/dashboard/cm';
      else if (role === 'officer' || role === 'department_head') window.location.href = '/dashboard/officer';
      else if (role === 'admin') window.location.href = '/dashboard/admin';
      else window.location.href = '/dashboard/citizen';
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleRequestOTP = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/auth/login/otp/request`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || 'Failed to send OTP');
      setOtpSent(true);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/auth/login/otp/verify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || 'OTP verification failed');
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      window.location.href = '/dashboard/citizen';
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)', padding: '2rem', position: 'relative', overflow: 'hidden',
    }}>
      {/* Background elements */}
      <div style={{ position: 'absolute', top: '-300px', right: '-200px', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(30, 64, 175, 0.1) 0%, transparent 60%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-200px', left: '-100px', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 60%)', pointerEvents: 'none' }} />

      <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '420px', padding: '40px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '14px', margin: '0 auto 16px',
              background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '24px', fontWeight: 900, color: 'white',
            }}>D</div>
          </Link>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '4px' }}>Welcome Back</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Sign in to the Governance Dashboard</p>
        </div>

        {/* Mode Toggle */}
        <div style={{ display: 'flex', borderRadius: '10px', background: 'var(--bg-secondary)', padding: '4px', marginBottom: '24px' }}>
          <button
            onClick={() => { setIsOTP(false); setError(''); }}
            style={{
              flex: 1, padding: '10px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
              background: !isOTP ? 'var(--bg-elevated)' : 'transparent',
              color: !isOTP ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >Email / Password</button>
          <button
            onClick={() => { setIsOTP(true); setError(''); setOtpSent(false); }}
            style={{
              flex: 1, padding: '10px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
              background: isOTP ? 'var(--bg-elevated)' : 'transparent',
              color: isOTP ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >Phone OTP</button>
        </div>

        {error && (
          <div style={{
            padding: '12px 16px', borderRadius: '10px', marginBottom: '16px',
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#fca5a5', fontSize: '0.85rem',
          }}>
            {error}
          </div>
        )}

        {!isOTP ? (
          <form onSubmit={handlePasswordLogin}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Email or Phone</label>
              <input className="input" type="text" placeholder="cm@delhi.gov.in" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Password</label>
              <input className="input" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px' }} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Phone Number</label>
              <input className="input" type="tel" placeholder="+919876543210" value={phone} onChange={(e) => setPhone(e.target.value)} required disabled={otpSent} />
            </div>
            {!otpSent ? (
              <button type="button" className="btn btn-primary" style={{ width: '100%', padding: '14px' }} onClick={handleRequestOTP} disabled={loading || !phone}>
                {loading ? 'Sending...' : 'Send OTP →'}
              </button>
            ) : (
              <>
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Enter OTP</label>
                  <input className="input" type="text" placeholder="123456" value={otp} onChange={(e) => setOtp(e.target.value)} required maxLength={6} style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5em' }} />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px' }} disabled={loading || otp.length !== 6}>
                  {loading ? 'Verifying...' : 'Verify OTP →'}
                </button>
              </>
            )}
          </form>
        )}

        {/* Demo credentials */}
        <div style={{ marginTop: '24px', padding: '16px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '8px' }}>DEMO CREDENTIALS</p>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            <div><strong>CM:</strong> cm@delhi.gov.in</div>
            <div><strong>Officer:</strong> rajesh.verma@delhi.gov.in</div>
            <div><strong>Citizen:</strong> rohit.kumar@gmail.com</div>
            <div style={{ color: 'var(--text-muted)' }}>Password: Password123!</div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <Link href="/track" style={{ fontSize: '0.85rem', color: 'var(--primary-light)', textDecoration: 'none' }}>
            Track your complaint →
          </Link>
        </div>
      </div>
    </div>
  );
}
