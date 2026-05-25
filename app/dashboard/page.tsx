'use client';
// app/dashboard/page.tsx

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Stats {
  totalStudents: number;
  totalDepartments: number;
  totalUploads: number;
  recentUploads: number;
  studentsByDepartment: { department: string; count: number }[];
  studentsByYear: { year: number; count: number }[];
  studentsBySex: { sex: string; count: number }[];
  recentStudents: {
    _id: string;
    surname: string;
    otherNames: string;
    matricNumber: string;
    department: string;
    createdAt: string;
  }[];
}

function StatCard({
  label,
  value,
  icon,
  color,
  sub,
}: {
  label: string;
  value: number | string;
  icon: string;
  color: string;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
          style={{ background: color + '20' }}
        >
          {icon}
        </div>
        {sub && (
          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700">
            {sub}
          </span>
        )}
      </div>
      <p className="text-3xl font-extrabold text-gray-900 mb-1">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <p className="text-sm text-gray-500 font-medium">{label}</p>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth-token');
    fetch('/api/stats', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) setStats(data.stats);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <div className="grid grid-cols-4 gap-5 mb-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-gray-200 rounded-2xl h-36 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const totalMale = stats?.studentsBySex.find(s => s.sex === 'Male')?.count || 0;
  const totalFemale = stats?.studentsBySex.find(s => s.sex === 'Female')?.count || 0;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-1">Dashboard</h1>
        <p className="text-gray-500 font-medium">
          Welcome to the FUNATO Student ID Card Management System
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <StatCard
          label="Total Students"
          value={stats?.totalStudents || 0}
          icon="👥"
          color="#2d6a2d"
          sub="All time"
        />
        <StatCard
          label="Departments"
          value={stats?.totalDepartments || 0}
          icon="🏛️"
          color="#3b82f6"
        />
        <StatCard
          label="Total Imports"
          value={stats?.totalUploads || 0}
          icon="📥"
          color="#8b5cf6"
        />
        <StatCard
          label="Recent Imports"
          value={stats?.recentUploads || 0}
          icon="🔥"
          color="#f59e0b"
          sub="Last 7 days"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center">
          <div className="text-3xl mb-2">♂️</div>
          <p className="text-2xl font-extrabold text-blue-600">{totalMale.toLocaleString()}</p>
          <p className="text-sm text-gray-500 font-medium">Male Students</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center">
          <div className="text-3xl mb-2">♀️</div>
          <p className="text-2xl font-extrabold text-pink-500">{totalFemale.toLocaleString()}</p>
          <p className="text-sm text-gray-500 font-medium">Female Students</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center">
          <div className="text-3xl mb-2">📋</div>
          <p className="text-2xl font-extrabold text-green-600">
            {stats?.studentsByYear[0]?.year || new Date().getFullYear()}
          </p>
          <p className="text-sm text-gray-500 font-medium">Latest Import Year</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Breakdown */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-5">Students by Department</h2>
          {stats?.studentsByDepartment.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No data yet</p>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {stats?.studentsByDepartment.map(({ department, count }) => {
                const total = stats.totalStudents || 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={department}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-700 font-medium truncate pr-2">{department}</span>
                      <span className="text-sm font-bold text-gray-900 flex-shrink-0">{count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          background: 'linear-gradient(90deg, #2d6a2d, #4a9e4a)',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Students */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-gray-900">Recent Students</h2>
            <button
              onClick={() => router.push('/dashboard/students')}
              className="text-sm text-green-600 font-semibold hover:text-green-800 transition-colors"
            >
              View All →
            </button>
          </div>

          {stats?.recentStudents.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No students imported yet</p>
          ) : (
            <div className="space-y-3">
              {stats?.recentStudents.map(student => (
                <div
                  key={student._id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #2d6a2d, #4a9e4a)' }}
                  >
                    {student.surname[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {student.surname} {student.otherNames}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {student.matricNumber} · {student.department}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Actions */}
          <div className="mt-5 pt-5 border-t border-gray-100 grid grid-cols-2 gap-3">
            <button
              onClick={() => router.push('/dashboard/import')}
              className="py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #2d6a2d, #4a9e4a)' }}
            >
              📥 Import Data
            </button>
            <button
              onClick={() => router.push('/dashboard/cards')}
              className="py-2.5 rounded-xl text-sm font-semibold text-gray-700 border border-gray-200 bg-white hover:bg-gray-50 transition-all active:scale-95"
            >
              🪪 Generate Cards
            </button>
          </div>
        </div>
      </div>

      {/* Years breakdown */}
      {(stats?.studentsByYear.length ?? 0) > 0 && (
        <div className="mt-6 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Import Year Breakdown</h2>
          <div className="flex gap-4 flex-wrap">
            {stats?.studentsByYear.map(({ year, count }) => (
              <div
                key={year}
                className="flex-1 min-w-28 text-center p-4 rounded-xl border border-gray-100 bg-gray-50"
              >
                <p className="text-xl font-extrabold text-gray-900">{count}</p>
                <p className="text-sm text-gray-500 font-medium">{year}/{String(year + 1).slice(2)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
