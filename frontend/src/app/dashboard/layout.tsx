'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

const NAV_ITEMS: Record<string, Array<{ label: string; href: string; icon: string }>> = {
  cm: [
    { label: 'Overview', href: '/dashboard/cm', icon: '📊' },
    { label: 'Heatmap', href: '/dashboard/cm/heatmap', icon: '🗺️' },
    { label: 'Complaints', href: '/dashboard/cm/complaints', icon: '📋' },
    { label: 'Officer Ledger', href: '/dashboard/cm/officers', icon: '👮' },
    { label: 'SLA Report', href: '/dashboard/cm/sla', icon: '⏱️' },
    { label: 'Alerts', href: '/dashboard/cm/alerts', icon: '🚨' },
  ],
  officer: [
    { label: 'Kanban Board', href: '/dashboard/officer', icon: '📋' },
    { label: 'My Complaints', href: '/dashboard/officer/complaints', icon: '📝' },
  ],
  department_head: [
    { label: 'Kanban Board', href: '/dashboard/officer', icon: '📋' },
    { label: 'Team Overview', href: '/dashboard/officer/complaints', icon: '👥' },
  ],
  admin: [
    { label: 'Users', href: '/dashboard/admin', icon: '👥' },
    { label: 'Departments', href: '/dashboard/admin/departments', icon: '🏢' },
    { label: 'Audit Logs', href: '/dashboard/admin/audit', icon: '📜' },
  ],
  citizen: [
    { label: 'My Complaints', href: '/dashboard/citizen', icon: '📋' },
    { label: 'Submit New', href: '/dashboard/citizen/submit', icon: '✏️' },
    { label: 'Track', href: '/track', icon: '🔍' },
  ],
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      setUser(JSON.parse(stored));
    } else {
      window.location.href = '/login';
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div className="skeleton" style={{ width: '200px', height: '24px' }} />
      </div>
    );
  }

  const navItems = NAV_ITEMS[user.role] || NAV_ITEMS.citizen;
  const roleLabel = user.role === 'cm' ? 'Chief Minister' : user.role === 'department_head' ? 'Dept Head' : user.role.charAt(0).toUpperCase() + user.role.slice(1);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? '260px' : '72px',
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s ease',
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: 0,
        zIndex: 40,
      }}>
        {/* Logo area */}
        <div style={{
          padding: sidebarOpen ? '20px 20px' : '20px 16px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{
            width: '36px', height: '36px', minWidth: '36px', borderRadius: '10px',
            background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', fontWeight: 800, color: 'white',
          }}>D</div>
          {sidebarOpen && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap' }}>Delhi CM</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>GRIEVANCE PORTAL</div>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: sidebarOpen ? '10px 12px' : '10px',
                  borderRadius: '10px', textDecoration: 'none',
                  background: isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                  color: isActive ? '#93c5fd' : 'var(--text-secondary)',
                  fontWeight: isActive ? 600 : 400,
                  fontSize: '0.9rem',
                  transition: 'all 0.15s',
                  justifyContent: sidebarOpen ? 'flex-start' : 'center',
                  border: isActive ? '1px solid rgba(59, 130, 246, 0.15)' : '1px solid transparent',
                }}
              >
                <span style={{ fontSize: '1.1rem', minWidth: '24px', textAlign: 'center' }}>{item.icon}</span>
                {sidebarOpen && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div style={{
          padding: sidebarOpen ? '16px 16px' : '16px 8px',
          borderTop: '1px solid var(--border-color)',
        }}>
          {sidebarOpen && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '2px' }}>{user.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{roleLabel}</div>
            </div>
          )}
          <button
            onClick={handleLogout}
            style={{
              width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)',
              background: 'transparent', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            }}
          >
            🚪 {sidebarOpen && 'Sign Out'}
          </button>
        </div>

        {/* Toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            position: 'absolute', top: '28px', right: '-14px',
            width: '28px', height: '28px', borderRadius: '50%',
            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
            color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.7rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {sidebarOpen ? '◂' : '▸'}
        </button>
      </aside>

      {/* Main content */}
      <main style={{
        flex: 1,
        marginLeft: sidebarOpen ? '260px' : '72px',
        transition: 'margin-left 0.3s ease',
        padding: '24px 32px',
        minHeight: '100vh',
      }}>
        {children}
      </main>
    </div>
  );
}
