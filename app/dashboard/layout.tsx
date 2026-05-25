'use client';
// app/dashboard/layout.tsx

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/dashboard/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth-token');
    if (!token) {
      router.push('/login');
      return;
    }

    // Verify token
    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setAdminName(data.admin.name);
          setAdminEmail(data.admin.email);
        } else {
          localStorage.removeItem('auth-token');
          router.push('/login');
        }
      })
      .catch(() => {
        router.push('/login');
      })
      .finally(() => setChecking(false));
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex" style={{ fontFamily: 'Lexend, sans-serif' }}>
      <Sidebar adminName={adminName} adminEmail={adminEmail} />
      <main
        className="flex-1 min-h-screen"
        style={{ marginLeft: '260px' }}
      >
        {children}
      </main>
    </div>
  );
}
