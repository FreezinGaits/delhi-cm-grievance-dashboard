'use client';

import { usePathname } from 'next/navigation';

const MOCK_USERS = [
  { id: '1', name: 'Arvind Kumar', email: 'cm@delhi.gov.in', role: 'cm', dept: '—', status: 'active', lastLogin: '10 min ago' },
  { id: '2', name: 'System Admin', email: 'admin@delhi.gov.in', role: 'admin', dept: '—', status: 'active', lastLogin: '1 hr ago' },
  { id: '3', name: 'Rajesh Verma', email: 'rajesh.verma@delhi.gov.in', role: 'department_head', dept: 'DJB', status: 'active', lastLogin: '30 min ago' },
  { id: '4', name: 'Priya Singh', email: 'priya.singh@delhi.gov.in', role: 'officer', dept: 'DJB', status: 'active', lastLogin: '2 hrs ago' },
  { id: '5', name: 'Amit Gupta', email: 'amit.gupta@delhi.gov.in', role: 'officer', dept: 'DJB', status: 'active', lastLogin: '1 day ago' },
  { id: '6', name: 'Vikram Sharma', email: 'vikram.sharma@delhi.gov.in', role: 'department_head', dept: 'PWD', status: 'active', lastLogin: '5 hrs ago' },
  { id: '7', name: 'Rohit Kumar', email: 'rohit.kumar@gmail.com', role: 'citizen', dept: '—', status: 'active', lastLogin: '3 hrs ago' },
  { id: '8', name: 'Sneha Devi', email: 'sneha.devi@gmail.com', role: 'citizen', dept: '—', status: 'active', lastLogin: '12 hrs ago' },
];

const MOCK_DEPARTMENTS = [
  { id: '1', code: 'DJB', name: 'Delhi Jal Board', head: 'Rajesh Verma', status: 'Active', complaintsCount: 34 },
  { id: '2', code: 'PWD', name: 'Public Works Department', head: 'Vikram Sharma', status: 'Active', complaintsCount: 22 },
  { id: '3', code: 'MCD', name: 'Municipal Corporation of Delhi', head: 'Amit Gupta', status: 'Active', complaintsCount: 45 },
  { id: '4', code: 'BSES', name: 'BSES Electricity', head: 'Sanjay Kumar', status: 'Active', complaintsCount: 19 },
  { id: '5', code: 'POLICE', name: 'Delhi Police', head: 'Neha Sharma', status: 'Active', complaintsCount: 12 },
];

const MOCK_AUDIT_LOGS = [
  { id: '101', timestamp: '2026-06-17 15:10:22', user: 'admin@delhi.gov.in', action: 'CREATE_USER', details: 'Added new officer Priya Singh (DJB)', level: 'INFO' },
  { id: '102', timestamp: '2026-06-17 14:45:01', user: 'System Auto-Router', action: 'AUTO_ROUTE', details: 'Routed complaint #DJB-89304 to Rajesh Verma', level: 'INFO' },
  { id: '103', timestamp: '2026-06-17 13:12:15', user: 'System Scheduler', action: 'SLA_BREACH', details: 'Ticket #PWD-29472 breached SLA limits', level: 'WARNING' },
  { id: '104', timestamp: '2026-06-17 12:30:44', user: 'rohit.kumar@gmail.com', action: 'CITIZEN_VETO', details: 'Rejected resolution & escalated ticket #MCD-78204', level: 'CRITICAL' },
  { id: '105', timestamp: '2026-06-17 10:05:19', user: 'cm@delhi.gov.in', action: 'LOGIN_SUCCESS', details: 'Chief Minister dashboard session initialized', level: 'INFO' },
];

export default function AdminDashboard() {
  const pathname = usePathname() || '';
  const activeTab = pathname.endsWith('/departments') ? 'departments' :
                    pathname.endsWith('/audit') ? 'audit' : 'users';

  const roleColors: Record<string, string> = { cm: '#ef4444', admin: '#8b5cf6', department_head: '#f59e0b', officer: '#3b82f6', citizen: '#10b981' };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '4px' }}>
            {activeTab === 'users' ? 'User Management' : activeTab === 'departments' ? 'Department Directory' : 'Audit Logs'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {activeTab === 'users' ? `${MOCK_USERS.length} total users across all roles` :
             activeTab === 'departments' ? `${MOCK_DEPARTMENTS.length} active administrative departments` :
             'Secure tamper-proof system activity log'}
          </p>
        </div>
        <div>
          {activeTab === 'users' && <button className="btn btn-primary">➕ Add User</button>}
          {activeTab === 'departments' && <button className="btn btn-primary">🏢 Add Department</button>}
        </div>
      </div>

      {activeTab === 'users' && (
        <>
          {/* Role summary */}
          <div className="stagger-children" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '28px' }}>
            {['cm', 'admin', 'department_head', 'officer', 'citizen'].map((role) => {
              const count = MOCK_USERS.filter((u) => u.role === role).length;
              return (
                <div key={role} className="stat-card">
                  <div style={{ fontSize: '0.8rem', color: roleColors[role], fontWeight: 600, textTransform: 'capitalize', marginBottom: '4px' }}>
                    {role.replace(/_/g, ' ')}
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{count}</div>
                </div>
              );
            })}
          </div>

          {/* Users table */}
          <div className="glass-card" style={{ padding: '24px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  {['Name', 'Email', 'Role', 'Department', 'Status', 'Last Login', 'Actions'].map((h) => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MOCK_USERS.map((user) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '12px', fontWeight: 600 }}>{user.name}</td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{user.email}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, background: `${roleColors[user.role]}22`, color: roleColors[user.role], textTransform: 'capitalize' }}>
                        {user.role.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{user.dept}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '0.75rem', background: 'rgba(16,185,129,0.15)', color: '#6ee7b7' }}>Active</span>
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{user.lastLogin}</td>
                    <td style={{ padding: '12px' }}>
                      <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'departments' && (
        <div className="glass-card" style={{ padding: '24px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                {['Code', 'Name', 'Head Officer', 'Active Complaints', 'Status', 'Actions'].map((h) => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_DEPARTMENTS.map((dept) => (
                <tr key={dept.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px', fontWeight: 700, color: '#93c5fd' }}>{dept.code}</td>
                  <td style={{ padding: '12px', fontWeight: 600 }}>{dept.name}</td>
                  <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{dept.head}</td>
                  <td style={{ padding: '12px' }}>{dept.complaintsCount}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '0.75rem', background: 'rgba(16,185,129,0.15)', color: '#6ee7b7' }}>{dept.status}</span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>Configure</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="glass-card" style={{ padding: '24px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                {['Timestamp', 'Level', 'User/Actor', 'Action', 'Details'].map((h) => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_AUDIT_LOGS.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{log.timestamp}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700,
                      background: log.level === 'CRITICAL' ? 'rgba(239,68,68,0.15)' : log.level === 'WARNING' ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,246,0.15)',
                      color: log.level === 'CRITICAL' ? '#fca5a5' : log.level === 'WARNING' ? '#fbbf24' : '#93c5fd',
                    }}>{log.level}</span>
                  </td>
                  <td style={{ padding: '12px', fontWeight: 600 }}>{log.user}</td>
                  <td style={{ padding: '12px', color: '#38bdf8', fontWeight: 600 }}>{log.action}</td>
                  <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
