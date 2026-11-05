'use client';
// app/dashboard/reports/page.tsx

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { COLLEGES, DEPARTMENTS, type UploadRecord } from '@/types';
import { uploadsApi } from '@/lib/apiClient';
import { ToastContainer, useToast } from '@/hooks/useToast';
import type { ReportSummary, BreakdownRow } from '@/lib/reportData';

type ExportType = 'report' | 'all' | 'printed' | 'unprinted' | 'cards' | 'incomplete';

interface Filters {
  college: string;
  department: string;
  year: string;
  sex: string;
  uploadId: string;
  from: string;
  to: string;
}
const EMPTY_FILTERS: Filters = {
  college: '',
  department: '',
  year: '',
  sex: '',
  uploadId: '',
  from: '',
  to: '',
};

const GREEN = 'linear-gradient(135deg, #2d6a2d, #4a9e4a)';

function toQuery(filters: Partial<Filters>, extra: Record<string, string> = {}) {
  const qs = new URLSearchParams();
  Object.entries({ ...filters, ...extra }).forEach(([k, v]) => {
    if (v) qs.set(k, v);
  });
  return qs.toString();
}

async function downloadFile(url: string): Promise<number> {
  const token = localStorage.getItem('auth-token') || '';
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    let message = `Download failed (${res.status})`;
    try {
      message = (await res.json()).message || message;
    } catch {
      /* not JSON */
    }
    throw new Error(message);
  }
  const blob = await res.blob();
  const match = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = match?.[1] || 'FUNATO_report.xlsx';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return Number(res.headers.get('X-Row-Count') || 0);
}

function Kpi({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <p className="text-sm text-gray-500 font-medium mb-2">{label}</p>
      <p className="text-3xl font-extrabold" style={{ color }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function Bar({ pct }: { pct: number }) {
  return (
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden min-w-20">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: GREEN }} />
    </div>
  );
}

function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm break-inside-avoid">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function BreakdownTable({
  rows,
  labelHeader,
  renderActions,
  maxHeight,
}: {
  rows: BreakdownRow[];
  labelHeader: string;
  renderActions?: (row: BreakdownRow) => React.ReactNode;
  maxHeight?: string;
}) {
  if (!rows.length) return <p className="text-sm text-gray-400 text-center py-6">No data</p>;
  return (
    <div className="overflow-auto" style={{ maxHeight }}>
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-white">
          <tr className="text-left text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100">
            <th className="py-2 pr-3 font-semibold">{labelHeader}</th>
            <th className="py-2 px-2 font-semibold text-right">Total</th>
            <th className="py-2 px-2 font-semibold text-right">Printed</th>
            <th className="py-2 px-2 font-semibold text-right">Pending</th>
            <th className="py-2 px-2 font-semibold w-32">Progress</th>
            {renderActions && <th className="py-2 pl-2 no-print" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-gray-50 last:border-0">
              <td className="py-2.5 pr-3 font-medium text-gray-800">{r.label}</td>
              <td className="py-2.5 px-2 text-right font-bold">{r.total.toLocaleString()}</td>
              <td className="py-2.5 px-2 text-right text-green-700">{r.printed.toLocaleString()}</td>
              <td className="py-2.5 px-2 text-right text-amber-600">{r.unprinted.toLocaleString()}</td>
              <td className="py-2.5 px-2">
                <div className="flex items-center gap-2">
                  <Bar pct={r.pct} />
                  <span className="text-xs text-gray-500 w-10 text-right">{r.pct}%</span>
                </div>
              </td>
              {renderActions && <td className="py-2.5 pl-2 text-right no-print">{renderActions(r)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MiniButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-2.5 py-1 rounded-lg text-xs font-semibold text-green-700 border border-green-200 hover:bg-green-50 disabled:opacity-50 whitespace-nowrap"
    >
      {children}
    </button>
  );
}

export default function ReportsPage() {
  const router = useRouter();
  const toast = useToast();
  const toastError = toast.error;

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string>('');
  const [scope, setScope] = useState<'all' | 'printed' | 'unprinted'>('all');
  const [format, setFormat] = useState<'xlsx' | 'csv'>('xlsx');

  const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);
  const set = (k: keyof Filters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFilters((f) => ({ ...f, [k]: e.target.value }));
  const hasFilters = Object.values(filters).some(Boolean);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth-token') || '';
      const res = await fetch(`/api/reports/summary?${toQuery(filters)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load report');
      setSummary(data.summary);
    } catch (err) {
      toastError('Failed to load report', (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filters, toastError]);

  useEffect(() => {
    queueMicrotask(() => {
      fetchSummary();
    });
  }, [fetchSummary]);

  useEffect(() => {
    uploadsApi
      .list()
      .then((d) => setUploads(d.uploads))
      .catch(() => undefined);
  }, []);

  const batchName = uploads.find((u) => u._id === filters.uploadId)?.originalName || '';

  const download = async (key: string, type: ExportType, override: Partial<Filters> = {}, extra: Record<string, string> = {}) => {
    setBusy(key);
    try {
      const merged = { ...filters, ...override };
      const query = toQuery(merged, {
        type,
        ...(merged.uploadId && batchName && merged.uploadId === filters.uploadId ? { batchName } : {}),
        ...extra,
      });
      const rows = await downloadFile(`/api/reports/export?${query}`);
      toast.success('Download started', type === 'report' ? 'Summary report ready' : `${rows.toLocaleString()} record(s) exported`);
    } catch (err) {
      toastError('Download failed', (err as Error).message);
    } finally {
      setBusy('');
    }
  };

  const t = summary?.totals;
  const maxActivity = Math.max(1, ...(summary?.activity.map((a) => a.count) || [1]));
  const q = summary?.quality;

  const exports: { key: string; type: ExportType; icon: string; title: string; desc: string; count?: number }[] = [
    { key: 'report', type: 'report', icon: '📊', title: 'Full Summary Report', desc: 'Overview, college, department, session, batch, print activity.' },
    { key: 'unprinted', type: 'unprinted', icon: '⏳', title: 'Unprinted ID Cards', desc: 'Student details for cards not yet printed.', count: t?.unprinted },
    { key: 'printed', type: 'printed', icon: '✅', title: 'Printed ID Cards', desc: 'Student details for cards already printed.', count: t?.printed },
    { key: 'cards', type: 'cards', icon: '🪪', title: 'Printed + Unprinted (one file)', desc: 'Both lists on separate sheets, plus a status summary.', count: t?.total },
    { key: 'incomplete', type: 'incomplete', icon: '⚠️', title: 'Incomplete Records', desc: 'Missing passport, blood group or genotype.', count: q?.incomplete },
  ];

  return (
    <div className="p-8" id="print-area">
      <style>{`
        @media print {
          #print-area { position: static !important; }
          main { margin-left: 0 !important; }
          .break-inside-avoid { break-inside: avoid; }
        }
      `}</style>
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-1">Reports</h1>
          <p className="text-gray-500 font-medium">
            ID card production status, student data exports and data quality
          </p>
          <p className="hidden print:block text-xs text-gray-500 mt-1">
            Generated {summary ? new Date(summary.generatedAt).toLocaleString('en-GB') : ''}
          </p>
        </div>
        <div className="flex gap-2 no-print">
          <button
            onClick={fetchSummary}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-700 border border-gray-200 bg-white hover:bg-gray-50"
          >
            ↻ Refresh
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90"
            style={{ background: GREEN }}
          >
            🖨️ Print / Save as PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-6 no-print">
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-3">
          <select className="form-input" value={filters.college} onChange={set('college')}>
            <option value="">All Colleges</option>
            {COLLEGES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select className="form-input" value={filters.department} onChange={set('department')}>
            <option value="">All Departments</option>
            {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
          </select>
          <select className="form-input" value={filters.year} onChange={set('year')}>
            <option value="">All Sessions</option>
            {years.map((y) => <option key={y} value={y}>{y}/{String(y + 1).slice(2)}</option>)}
          </select>
          <select className="form-input" value={filters.sex} onChange={set('sex')}>
            <option value="">Male &amp; Female</option>
            <option>Male</option>
            <option>Female</option>
          </select>
          <select className="form-input" value={filters.uploadId} onChange={set('uploadId')}>
            <option value="">All Import Batches</option>
            {uploads.map((u) => (
              <option key={u._id} value={u._id}>{u.originalName || u.fileName}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-xs text-gray-500 font-medium">
            Added from
            <input type="date" className="form-input" value={filters.from} onChange={set('from')} />
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-500 font-medium">
            to
            <input type="date" className="form-input" value={filters.to} onChange={set('to')} />
          </label>
          {hasFilters && (
            <button
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="text-sm font-semibold text-red-600 hover:text-red-700 text-left px-2"
            >
              ✕ Clear filters
            </button>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Filters apply to the numbers below and to every download on this page.
        </p>
      </div>

      {loading || !summary || !t || !q ? (
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-5">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="bg-gray-200 rounded-2xl h-28 animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 xl:grid-cols-5 gap-5 mb-6">
            <Kpi label="Total Students" value={t.total} color="#2d6a2d" sub={`${t.male.toLocaleString()} male · ${t.female.toLocaleString()} female`} />
            <Kpi label="Cards Printed" value={t.printed} color="#16a34a" sub={t.reprinted ? `${t.reprinted.toLocaleString()} printed more than once` : undefined} />
            <Kpi label="Awaiting Print" value={t.unprinted} color="#d97706" />
            <Kpi label="Completion" value={`${t.pct}%`} color="#2563eb" />
            <Kpi label="Incomplete Records" value={q.incomplete} color={q.incomplete ? '#dc2626' : '#16a34a'} sub={`${q.missingPassport} no passport`} />
          </div>

          {/* Downloads */}
          <div className="mb-6 no-print">
            <Card title="Download Reports (Excel)">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {exports.map((e) => (
                  <button
                    key={e.key}
                    onClick={() => download(e.key, e.type)}
                    disabled={!!busy}
                    className="text-left p-4 rounded-xl border border-gray-200 hover:border-green-500 hover:bg-green-50/40 transition-all disabled:opacity-60"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{busy === e.key ? '⏳' : e.icon}</span>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-gray-900">{e.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{e.desc}</p>
                        {e.count !== undefined && (
                          <p className="text-xs font-semibold text-green-700 mt-1.5">
                            {e.count.toLocaleString()} record(s) · .xlsx
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          </div>

          {/* Student list export */}
          <div className="mb-6 no-print">
            <Card title="Export Student Lists">
              <p className="text-sm text-gray-500 mb-4">
                Download student records straight from here
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                {([
                  ['all', 'All uploaded students', t.total],
                  ['printed', 'Printed students', t.printed],
                  ['unprinted', 'Not yet printed', t.unprinted],
                ] as const).map(([key, label, count]) => (
                  <button
                    key={key}
                    onClick={() => setScope(key)}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      scope === key ? 'border-green-600 bg-green-50' : 'border-gray-200 hover:border-green-300'
                    }`}
                  >
                    <p className="font-bold text-sm text-gray-900">{label}</p>
                    <p className="text-2xl font-extrabold mt-1" style={{ color: '#2d6a2d' }}>
                      {count.toLocaleString()}
                    </p>
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  className="form-input max-w-48"
                  value={format}
                  onChange={(e) => setFormat(e.target.value as 'xlsx' | 'csv')}
                >
                  <option value="xlsx">Excel (.xlsx)</option>
                  <option value="csv">CSV (.csv)</option>
                </select>
                <button
                  onClick={() => download('export-list', scope, {}, { format })}
                  disabled={!!busy}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                  style={{ background: GREEN }}
                >
                  {busy === 'export-list' ? '⏳ Preparing…' : '⬇ Download list'}
                </button>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card title="Progress by College">
              <BreakdownTable
                rows={summary.byCollege}
                labelHeader="College"
                renderActions={(r) => (
                  <MiniButton disabled={!!busy || !r.unprinted} onClick={() => download(`col-${r.label}`, 'unprinted', { college: r.label })}>
                    ⬇ Unprinted
                  </MiniButton>
                )}
              />
            </Card>

            <Card title="Progress by Department">
              <BreakdownTable
                rows={summary.byDepartment}
                labelHeader="Department"
                maxHeight="520px"
                renderActions={(r) => (
                  <MiniButton disabled={!!busy || !r.unprinted} onClick={() => download(`dep-${r.label}`, 'unprinted', { department: r.label })}>
                    ⬇ Unprinted
                  </MiniButton>
                )}
              />
            </Card>

            <Card title="Import Batches">
              {summary.byBatch.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No data</p>
              ) : (
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100">
                        <th className="py-2 pr-3 font-semibold">File</th>
                        <th className="py-2 px-2 font-semibold">Uploaded</th>
                        <th className="py-2 px-2 font-semibold text-right">Total</th>
                        <th className="py-2 px-2 font-semibold text-right">Printed</th>
                        <th className="py-2 px-2 font-semibold text-right">Pending</th>
                        <th className="py-2 px-2 font-semibold w-28">Progress</th>
                        <th className="py-2 pl-2 no-print" />
                      </tr>
                    </thead>
                    <tbody>
                      {summary.byBatch.map((b) => (
                        <tr key={b.uploadId} className="border-b border-gray-50 last:border-0">
                          <td className="py-2.5 pr-3 font-medium text-gray-800">
                            {b.fileName}
                            {b.uploadedBy && <span className="block text-xs text-gray-400">{b.uploadedBy}</span>}
                          </td>
                          <td className="py-2.5 px-2 text-gray-500 whitespace-nowrap">
                            {b.uploadedAt ? new Date(b.uploadedAt).toLocaleDateString('en-GB') : '—'}
                          </td>
                          <td className="py-2.5 px-2 text-right font-bold">{b.total.toLocaleString()}</td>
                          <td className="py-2.5 px-2 text-right text-green-700">{b.printed.toLocaleString()}</td>
                          <td className="py-2.5 px-2 text-right text-amber-600">{b.unprinted.toLocaleString()}</td>
                          <td className="py-2.5 px-2">
                            <div className="flex items-center gap-2">
                              <Bar pct={b.pct} />
                              <span className="text-xs text-gray-500 w-10 text-right">{b.pct}%</span>
                            </div>
                          </td>
                          <td className="py-2.5 pl-2 text-right no-print">
                            <div className="flex gap-2 justify-end">
                              <MiniButton disabled={!!busy} onClick={() => download(`bat-all-${b.uploadId}`, 'all', { uploadId: b.uploadId }, { batchName: b.fileName })}>
                                ⬇ All
                              </MiniButton>
                              <MiniButton disabled={!!busy || !b.unprinted} onClick={() => download(`bat-${b.uploadId}`, 'unprinted', { uploadId: b.uploadId }, { batchName: b.fileName })}>
                                ⬇ Unprinted
                              </MiniButton>
                              {b.uploadId !== 'manual' && (
                                <MiniButton disabled={!b.unprinted} onClick={() => router.push(`/dashboard/cards?uploadId=${b.uploadId}&printed=unprinted`)}>
                                  🖨️ Print pending
                                </MiniButton>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="Print Activity (last 30 active days)">
                {summary.activity.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No cards printed yet</p>
                ) : (
                  <>
                    <div className="flex items-end gap-1 h-40">
                      {summary.activity.map((a) => (
                        <div key={a.date} className="flex-1 flex flex-col justify-end h-full group relative">
                          <div
                            className="w-full rounded-t"
                            style={{ height: `${(a.count / maxActivity) * 100}%`, background: GREEN, minHeight: 3 }}
                            title={`${a.date}: ${a.count}`}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-2">
                      <span>{summary.activity[0].date}</span>
                      <span>{summary.activity[summary.activity.length - 1].date}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      Based on each student&apos;s most recent print date.
                    </p>
                  </>
                )}
              </Card>

              <Card title="Data Quality">
                <div className="space-y-3 text-sm">
                  {[
                    ['Missing passport photo', q.missingPassport],
                    ['Missing blood group', q.missingBloodGroup],
                    ['Missing genotype', q.missingGenotype],
                  ].map(([label, n]) => (
                    <div key={label as string} className="flex items-center justify-between">
                      <span className="text-gray-700 font-medium">{label}</span>
                      <span className={`font-bold ${n ? 'text-red-600' : 'text-green-600'}`}>
                        {(n as number).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 no-print">
                  <MiniButton disabled={!!busy || !q.incomplete} onClick={() => download('incomplete', 'incomplete')}>
                    ⬇ Download incomplete records
                  </MiniButton>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card title="By Session">
                <BreakdownTable rows={summary.bySession} labelHeader="Session" />
              </Card>
              <Card title="Blood Groups">
                <DistList items={summary.bloodGroups} total={t.total} />
              </Card>
              <Card title="Genotypes">
                <DistList items={summary.genotypes} total={t.total} />
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function DistList({ items, total }: { items: { label: string; count: number }[]; total: number }) {
  if (!items.length) return <p className="text-sm text-gray-400 text-center py-6">No data</p>;
  return (
    <div className="space-y-2.5">
      {items.map((i) => (
        <div key={i.label}>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium text-gray-700">{i.label}</span>
            <span className="font-bold text-gray-900">{i.count.toLocaleString()}</span>
          </div>
          <Bar pct={total ? Math.round((i.count / total) * 100) : 0} />
        </div>
      ))}
    </div>
  );
}
