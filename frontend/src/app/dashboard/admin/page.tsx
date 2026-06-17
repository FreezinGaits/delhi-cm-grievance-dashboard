'use client';

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

export default function AdminDashboard() {
  const roleColors: Record<string, string> = { cm: '#ef4444', admin: '#8b5cf6', department_head: '#f59e0b', officer: '#3b82f6', citizen: '#10b981' };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '4px' }}>User Management</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{MOCK_USERS.length} total users across all roles</p>
        </div>
        <button className="btn btn-primary">➕ Add User</button>
      </div>

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
    </div>
  );
}
