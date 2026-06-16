'use client';
// app/dashboard/students/page.tsx

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { COLLEGES, DEPARTMENTS, type Student, type UploadRecord } from '@/types';
import { maintenanceApi, studentsApi, uploadsApi } from '@/lib/apiClient';
import EditStudentModal from '@/components/students/EditStudentModal';
import { ToastContainer, useToast } from '@/hooks/useToast';

const DEPARTMENTS_FILTER = [
  'All Departments',
  ...DEPARTMENTS,
];

export default function StudentsPage() {
  const router = useRouter();
  const toast = useToast();
  const toastError = toast.error;
  const [students, setStudents] = useState<Student[]>([]);
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [repairing, setRepairing] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [college, setCollege] = useState('');
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('');
  const [sex, setSex] = useState('');
  const [printed, setPrinted] = useState('');
  const [uploadId, setUploadId] = useState('');
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const limit = 50;

  const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit };
      if (search) params.search = search;
      if (college) params.college = college;
      if (department) params.department = department;
      if (year) params.year = year;
      if (sex) params.sex = sex;
      if (printed) params.printed = printed;
      if (uploadId) params.uploadId = uploadId;

      const data = await studentsApi.list(params);
      setStudents(data.students);
      setTotal(data.pagination.total);
      setPages(data.pagination.pages);
    } catch (err) {
      toastError('Failed to load students', (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, search, college, department, year, sex, printed, uploadId, toastError]);

  const fetchUploads = useCallback(async () => {
    try {
      const data = await uploadsApi.list();
      setUploads(data.uploads);
    } catch (err) {
      toastError('Failed to load uploads', (err as Error).message);
    }
  }, [toastError]);

  useEffect(() => {
    queueMicrotask(() => {
      fetchStudents();
      fetchUploads();
    });
  }, [fetchStudents, fetchUploads]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await studentsApi.delete(id);
      toast.success('Student deleted successfully');
      setDeleteId(null);
      fetchStudents();
    } catch (err) {
      toast.error('Delete failed', (err as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.size) return;
    setDeleting(true);
    let count = 0;
    for (const id of selectedIds) {
      try {
        await studentsApi.delete(id);
        count++;
      } catch {}
    }
    toast.success(`Deleted ${count} students`);
    setSelectedIds(new Set());
    fetchStudents();
    setDeleting(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === students.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(students.map(s => s._id!)));
    }
  };

  const handlePrintAllPages = () => {
    const params = new URLSearchParams({ all: '1' });
    if (search) params.set('search', search);
    if (college) params.set('college', college);
    if (department) params.set('department', department);
    if (year) params.set('year', year);
    if (sex) params.set('sex', sex);
    if (printed) params.set('printed', printed);
    if (uploadId) params.set('uploadId', uploadId);
    router.push(`/dashboard/print?${params.toString()}`);
  };

  const handlePrintUploadUnprinted = () => {
    if (!uploadId) {
      toast.warning('Select an upload batch', 'Choose one upload history first.');
      return;
    }
    const params = new URLSearchParams({
      all: '1',
      uploadId,
      printed: 'unprinted',
      sort: 'college',
    });
    if (college) params.set('college', college);
    router.push(`/dashboard/print?${params.toString()}`);
  };

  const handleMarkUploadPrinted = async () => {
    if (!uploadId) {
      toast.warning('Select an upload batch', 'Choose the upload batch already printed.');
      return;
    }
    try {
      const result = await uploadsApi.markPrinted(uploadId);
      toast.success(`Marked ${result.updated} students as printed`);
      fetchStudents();
      fetchUploads();
    } catch (err) {
      toast.error('Update failed', (err as Error).message);
    }
  };

  const handleDeleteUploadBatch = async () => {
    if (!uploadId) {
      toast.warning('Select an upload batch', 'Choose the upload history to delete.');
      return;
    }

    const upload = uploads.find(item => item._id === uploadId);
    const label = upload?.originalName || upload?.fileName || 'selected upload';
    const confirmed = window.confirm(
      `Delete "${label}" and all ${upload?.studentCount ?? ''} students in this batch? This cannot be undone.`,
    );

    if (!confirmed) return;

    setDeleting(true);
    try {
      const result = await uploadsApi.deleteBatch(uploadId);
      toast.success(
        'Upload batch deleted',
        `${result.deletedStudents} students removed`,
      );
      setUploadId('');
      setSelectedIds(new Set());
      fetchStudents();
      fetchUploads();
    } catch (err) {
      toast.error('Delete batch failed', (err as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const handleNormalizeDepartments = async () => {
    setRepairing(true);
    try {
      const result = await maintenanceApi.normalizeDepartments();
      toast.success(
        'Departments normalized',
        `${result.updated} of ${result.checked} students updated`,
      );
      fetchStudents();
    } catch (err) {
      toast.error('Repair failed', (err as Error).message);
    } finally {
      setRepairing(false);
    }
  };

  const passportUpload = async (student: Student, file: File) => {
    try {
      await studentsApi.uploadPassport(student._id!, file);
      toast.success('Photo uploaded!');
      fetchStudents();
    } catch (err) {
      toast.error('Upload failed', (err as Error).message);
    }
  };

  return (
    <div className="p-8" style={{ fontFamily: 'Lexend, sans-serif' }}>
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-1">Students</h1>
          <p className="text-gray-500 font-medium">
            {total.toLocaleString()} total students
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handlePrintAllPages}
            disabled={total === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Print All {total > 0 ? total.toLocaleString() : ''}
          </button>
          <button
            onClick={handlePrintUploadUnprinted}
            disabled={!uploadId}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Print Upload Unprinted
          </button>
          {selectedIds.size > 0 && (
            <>
              <button
                onClick={() => router.push(`/dashboard/print?ids=${Array.from(selectedIds).join(',')}`)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors text-sm"
              >
                🖨️ Print {selectedIds.size}
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors text-sm disabled:opacity-70"
              >
                🗑️ Delete {selectedIds.size}
              </button>
            </>
          )}
          <button
            onClick={() => router.push('/dashboard/import')}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-white font-semibold rounded-xl text-sm"
            style={{ background: 'linear-gradient(135deg, #2d6a2d, #4a9e4a)' }}
          >
            📥 Import Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="lg:col-span-2">
            <input
              type="text"
              placeholder="🔍  Search by name or matric number..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="form-input"
            />
          </div>
          <select
            value={college}
            onChange={e => {
              setCollege(e.target.value);
              setPage(1);
            }}
            className="form-input"
          >
            <option value="">All Colleges</option>
            {COLLEGES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={uploadId}
            onChange={e => {
              setUploadId(e.target.value);
              setPage(1);
            }}
            className="form-input"
          >
            <option value="">All Uploads</option>
            {uploads.map(upload => (
              <option key={upload._id} value={upload._id}>
                {(upload.originalName || upload.fileName)} - {upload.unprintedCount ?? 0} unprinted
              </option>
            ))}
          </select>
          <select
            value={department}
            onChange={e => { setDepartment(e.target.value === 'All Departments' ? '' : e.target.value); setPage(1); }}
            className="form-input"
          >
            {DEPARTMENTS_FILTER.map(d => (
              <option key={d} value={d === 'All Departments' ? '' : d}>{d}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <select
              value={year}
              onChange={e => { setYear(e.target.value); setPage(1); }}
              className="form-input flex-1"
            >
              <option value="">All Years</option>
              {years.map(y => (
                <option key={y} value={y}>{y}/{String(y + 1).slice(2)}</option>
              ))}
            </select>
            <select
              value={sex}
              onChange={e => { setSex(e.target.value); setPage(1); }}
              className="form-input w-28"
            >
              <option value="">All Sex</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
            <select
              value={printed}
              onChange={e => { setPrinted(e.target.value); setPage(1); }}
              className="form-input w-36"
            >
              <option value="">All Print</option>
              <option value="unprinted">Unprinted</option>
              <option value="printed">Printed</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={handleMarkUploadPrinted}
            disabled={!uploadId}
            className="px-3 py-2 text-xs font-bold rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Mark Selected Upload Printed
          </button>
          <button
            onClick={handleDeleteUploadBatch}
            disabled={!uploadId || deleting}
            className="px-3 py-2 text-xs font-bold rounded-xl border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Delete Selected Upload Batch
          </button>
          <button
            onClick={handleNormalizeDepartments}
            disabled={repairing}
            className="px-3 py-2 text-xs font-bold rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {repairing ? 'Fixing Departments...' : 'Fix Department Duplicates'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/80">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === students.length && students.length > 0}
                    onChange={selectAll}
                    className="w-4 h-4 accent-green-600 rounded cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Matric No
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Sex
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Blood / Geno
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Year
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Photo
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5 border-t border-gray-100">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-gray-400 border-t border-gray-100">
                    <div className="text-5xl mb-3">👥</div>
                    <p className="font-semibold text-gray-500">No students found</p>
                    <p className="text-sm mt-1">Try adjusting filters or import student data</p>
                    <button
                      onClick={() => router.push('/dashboard/import')}
                      className="mt-4 px-5 py-2 rounded-xl text-sm font-semibold text-white"
                      style={{ background: '#2d6a2d' }}
                    >
                      Import Excel
                    </button>
                  </td>
                </tr>
              ) : (
                students.map(student => (
                  <tr
                    key={student._id}
                    className={`hover:bg-green-50/30 transition-colors ${
                      selectedIds.has(student._id!) ? 'bg-green-50/50' : ''
                    }`}
                  >
                    <td className="px-4 py-3.5 border-t border-gray-100">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(student._id!)}
                        onChange={() => toggleSelect(student._id!)}
                        className="w-4 h-4 accent-green-600 rounded cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3.5 border-t border-gray-100">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center font-bold text-white text-sm"
                          style={{ background: 'linear-gradient(135deg, #2d6a2d, #4a9e4a)' }}
                        >
                          {student.passportUrl || student.passportData ? (
                            <img
                              src={student.passportUrl || student.passportData}
                              alt={student.surname}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            student.surname[0]
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">
                            {student.surname} {student.otherNames}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 border-t border-gray-100">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded-lg font-mono font-semibold text-gray-700">
                        {student.matricNumber}
                      </code>
                    </td>
                    <td className="px-4 py-3.5 border-t border-gray-100">
                      <span className="text-sm text-gray-700 font-medium">{student.department}</span>
                    </td>
                    <td className="px-4 py-3.5 border-t border-gray-100">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          student.sex === 'Male'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-pink-100 text-pink-700'
                        }`}
                      >
                        {student.sex}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 border-t border-gray-100">
                      <span className="text-sm text-gray-600 font-medium">
                        {student.bloodGroup} / {student.genotype}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 border-t border-gray-100">
                      <span className="text-sm text-gray-600">{student.importYear}</span>
                    </td>
                    <td className="px-4 py-3.5 border-t border-gray-100">
                      <label className="cursor-pointer">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
                            student.passportUrl || student.passportData
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {student.passportUrl || student.passportData ? '📸 View' : '+ Upload'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) passportUpload(student, file);
                          }}
                        />
                      </label>
                    </td>
                    <td className="px-4 py-3.5 border-t border-gray-100">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditStudent(student)}
                          className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => router.push(`/dashboard/cards?id=${student._id}`)}
                          className="p-2 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                          title="Preview Card"
                        >
                          🪪
                        </button>
                        <button
                          onClick={() => setDeleteId(student._id!)}
                          className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-500 font-medium">
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total.toLocaleString()} students
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Prev
              </button>
              {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                const p = page <= 3 ? i + 1 : page + i - 2;
                if (p > pages) return null;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-9 h-9 text-sm font-bold rounded-xl transition-colors ${
                      p === page
                        ? 'text-white'
                        : 'border border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                    style={p === page ? { background: '#2d6a2d' } : {}}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editStudent && (
        <EditStudentModal
          student={editStudent}
          onClose={() => setEditStudent(null)}
          onSaved={updated => {
            setStudents(prev => prev.map(s => s._id === updated._id ? updated : s));
            setEditStudent(null);
            toast.success('Student updated successfully!');
          }}
        />
      )}

      {/* Delete Confirm Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h3 className="text-xl font-extrabold text-gray-900 mb-2">Delete Student?</h3>
            <p className="text-gray-500 text-sm mb-6">
              This action cannot be undone. The student record and ID card data will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-3 rounded-xl font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-70"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
