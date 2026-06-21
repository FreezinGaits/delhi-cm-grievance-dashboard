'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardIndexPage() {
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.replace('/login');
      return;
    }

    try {
      const user = JSON.parse(storedUser);
      const role = user.role;
      if (role === 'cm') {
        router.replace('/dashboard/cm');
      } else if (role === 'officer' || role === 'department_head') {
        router.replace('/dashboard/officer');
      } else if (role === 'admin') {
        router.replace('/dashboard/admin');
      } else {
        router.replace('/dashboard/citizen');
      }
    } catch (e) {
      router.replace('/dashboard/citizen');
    }
  }, [router]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div className="skeleton" style={{ width: '200px', height: '24px' }} />
    </div>
  );
}
