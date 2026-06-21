'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function HomePage() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  const features = [
    {
      icon: '🛡️',
      title: 'Field Visit Mode',
      desc: 'GPS-powered nearby complaint view for on-ground inspections with real-time data overlay',
      gradient: 'from-blue-600 to-cyan-500',
    },
    {
      icon: '✅',
      title: 'Citizen Veto',
      desc: 'No complaint closes until the citizen confirms — preventing false closure and desk-based fraud',
      gradient: 'from-emerald-600 to-green-500',
    },
    {
      icon: '🔗',
      title: 'Duplicate Clustering',
      desc: 'Geo-radius intelligent merging of complaints into master tickets with subscriber notifications',
      gradient: 'from-amber-600 to-orange-500',
    },
    {
      icon: '🚨',
      title: 'Critical Alert Engine',
      desc: 'Life-threatening complaints bypass queues with immediate escalation and 4-hour SLA',
      gradient: 'from-red-600 to-pink-500',
    },
    {
      icon: '📊',
      title: 'Officer Resource Ledger',
      desc: 'Real-time workload monitoring, bandwidth tracking, and intelligent re-routing of assignments',
      gradient: 'from-purple-600 to-violet-500',
    },
    {
      icon: '🔒',
      title: 'Anti-Fraud by Design',
      desc: 'EXIF geotagging validation, before/after proof, complete audit trail for every action',
      gradient: 'from-indigo-600 to-blue-500',
    },
  ];

  const stats = [
    { value: '50+', label: 'API Endpoints', icon: '⚡' },
    { value: '11', label: 'Data Models', icon: '🗄️' },
    { value: '5', label: 'User Roles', icon: '👥' },
    { value: '99.9%', label: 'Uptime Target', icon: '🎯' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Navigation */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(10, 14, 26, 0.8)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--glass-border)',
      }}>
        <div style={{
          maxWidth: '1280px', margin: '0 auto',
          padding: '0 1rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: '64px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', fontWeight: 800, color: 'white', flexShrink: 0,
            }}>
              D
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>Delhi CM Grievance</div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '0.05em', display: 'none' }} className="nav-subtitle">GOVERNANCE INTELLIGENCE</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
            <Link href="/track" className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '8px 12px' }}>Track</Link>
            <Link href="/login" className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '8px 14px' }}>Login →</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{
        paddingTop: 'clamp(120px, 18vw, 160px)', paddingBottom: 'clamp(40px, 8vw, 80px)',
        textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute', top: '-200px', left: '50%', transform: 'translateX(-50%)',
          width: '800px', height: '800px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(30, 64, 175, 0.15) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 1.25rem', position: 'relative' }} className="animate-fade-in">
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '6px 16px', borderRadius: '999px', marginBottom: '24px',
            background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)',
            fontSize: '0.8rem', color: '#93c5fd', fontWeight: 500,
          }}>
            🏛️ Chief Minister&apos;s Office, Delhi
          </div>

          <h1 style={{
            fontSize: 'clamp(2rem, 5vw, 4rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: '24px',
            background: 'linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Governance Intelligence<br />
            <span style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              Command Center
            </span>
          </h1>

          <p style={{
            fontSize: 'clamp(0.95rem, 2vw, 1.15rem)', color: 'var(--text-secondary)',
            maxWidth: '640px', margin: '0 auto 40px',
            lineHeight: 1.7, padding: '0 0.5rem',
          }}>
            AI-powered grievance management platform with real-time field monitoring,
            citizen verification, and complete accountability chain for every complaint.
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', padding: '0 1rem' }}>
            <Link href="/login" className="btn btn-primary" style={{ padding: '14px 28px', fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>
              Access Dashboard →
            </Link>
            <Link href="/dashboard/citizen/submit" className="btn btn-ghost" style={{ padding: '14px 28px', fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>
              File a Complaint
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section style={{ maxWidth: '1000px', margin: '0 auto 60px', padding: '0 1rem' }}>
        <div className="glass-card" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '1px',
          overflow: 'hidden',
        }}>
          {stats.map((stat, i) => (
            <div key={i} style={{
              padding: 'clamp(16px, 3vw, 28px)', textAlign: 'center',
              borderRight: '1px solid var(--glass-border)',
              borderBottom: '1px solid var(--glass-border)',
            }}>
              <div style={{ fontSize: '1.25rem', marginBottom: '4px' }}>{stat.icon}</div>
              <div style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, color: 'var(--text-primary)' }}>{stat.value}</div>
              <div style={{ fontSize: 'clamp(0.7rem, 1.5vw, 0.8rem)', color: 'var(--text-muted)', fontWeight: 500 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section style={{ maxWidth: '1200px', margin: '0 auto 80px', padding: '0 1rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 800, marginBottom: '12px' }}>Primary Differentiators</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto', fontSize: 'clamp(0.85rem, 1.5vw, 1rem)' }}>
            Features that make this system stand out from standard complaint portals.
          </p>
        </div>

        <div className="stagger-children" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
          gap: '16px',
        }}>
          {features.map((feature, i) => (
            <div
              key={i}
              className="stat-card"
              onMouseEnter={() => setHoveredCard(i)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                cursor: 'default',
                transform: hoveredCard === i ? 'translateY(-4px)' : 'none',
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '12px' }}>{feature.icon}</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>{feature.title}</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Roles Section */}
      <section style={{ maxWidth: '1200px', margin: '0 auto 80px', padding: '0 1rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 800, marginBottom: '12px' }}>Multi-Role Access</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.85rem, 1.5vw, 1rem)' }}>Tailored experiences for every stakeholder in the grievance lifecycle.</p>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
          gap: '12px',
        }}>
          {[
            { role: 'Citizen', desc: 'Submit & track complaints, confirm resolution', color: '#3b82f6' },
            { role: 'Officer', desc: 'Kanban board, evidence upload, status management', color: '#10b981' },
            { role: 'Dept Head', desc: 'Team oversight, reassignment, SLA monitoring', color: '#f59e0b' },
            { role: 'Admin', desc: 'System configuration, user management, audit logs', color: '#8b5cf6' },
            { role: 'CM', desc: 'Analytics dashboard, field visit mode, spot directives', color: '#ef4444' },
          ].map((item, i) => (
            <div key={i} className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px', margin: '0 auto 10px',
                background: `${item.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.1rem', fontWeight: 700, color: item.color, border: `1px solid ${item.color}33`,
              }}>
                {item.role[0]}
              </div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '6px' }}>{item.role}</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-color)', padding: '32px 1rem', textAlign: 'center',
        color: 'var(--text-muted)', fontSize: '0.85rem',
      }}>
        <p>Delhi CM Grievance Dashboard — Governance Intelligence Platform</p>
        <p style={{ marginTop: '4px', fontSize: '0.75rem' }}>Built with Next.js • Express • MongoDB • Leaflet • Recharts</p>
      </footer>
    </div>
  );
}
