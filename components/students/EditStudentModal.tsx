'use client';
// components/students/EditStudentModal.tsx

import { useState, useEffect, useRef, FormEvent } from 'react';
import type { Student } from '@/types';
import { DEPARTMENTS, BLOOD_GROUPS, GENOTYPES, COLLEGES } from '@/types';
import { studentsApi } from '@/lib/apiClient';
import { fileToBase64 } from '@/lib/utils';

interface Props {
  student: Student | null;
  onClose: () => void;
  onSaved: (student: Student) => void;
}

export default function EditStudentModal({ student, onClose, onSaved }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<Partial<Student>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [passportPreview, setPassportPreview] = useState<string>('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (student) {
      queueMicrotask(() => {
        setForm({ ...student });
        setPassportPreview(student.passportUrl || student.passportData || '');
      });
    }
  }, [student]);

  if (!student) return null;

  const set = (field: keyof Student, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Photo must be less than 5MB');
      return;
    }

    setUploadingPhoto(true);
    try {
      const base64 = await fileToBase64(file);
      setPassportPreview(base64);
      setForm(prev => ({ ...prev, passportData: base64 }));
    } catch {
      setError('Failed to process image');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      let uploadedPassportUrl = form.passportUrl;

      // Upload passport if changed
      if (form.passportData && form.passportData !== student.passportData && student._id) {
        const uploadRes = await fetch('/api/upload/passport', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('auth-token')}`,
          },
          body: JSON.stringify({
            studentId: student._id,
            passportData: form.passportData,
          }),
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || !uploadData.success) {
          throw new Error(uploadData.message || 'Failed to upload passport');
        }
        uploadedPassportUrl = uploadData.passportUrl;
      }

      // Update student data
      const { passportData, ...updateData } = form;
      void passportData; // suppress unused warning
      const result = await studentsApi.update(student._id!, {
        ...updateData,
        passportUrl: uploadedPassportUrl,
      });
      
      if (result.success) {
        onSaved({ ...result.student, passportUrl: uploadedPassportUrl, passportData: undefined });
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        style={{ fontFamily: 'Lexend, sans-serif' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white rounded-t-3xl z-10">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900">Edit Student</h2>
            <p className="text-sm text-gray-500 mt-0.5">{student.matricNumber}</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
              ⚠️ {error}
            </div>
          )}

          {/* Passport Photo */}
          <div className="flex items-start gap-5">
            <div>
              <div
                className="w-24 h-28 rounded-2xl overflow-hidden bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-green-500 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {passportPreview ? (
                  <img src={passportPreview} alt="Passport" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-2">
                    <div className="text-3xl mb-1">📸</div>
                    <p className="text-xs text-gray-400">Upload</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 w-24 py-1.5 text-xs font-semibold text-green-700 border border-green-200 rounded-lg hover:bg-green-50 transition-colors"
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? 'Processing...' : 'Change Photo'}
              </button>
            </div>

            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Surname *</label>
                  <input
                    type="text"
                    value={form.surname || ''}
                    onChange={e => set('surname', e.target.value.toUpperCase())}
                    required
                    className="form-input"
                    placeholder="SURNAME"
                  />
                </div>
                <div>
                  <label className="form-label">Other Names *</label>
                  <input
                    type="text"
                    value={form.otherNames || ''}
                    onChange={e => set('otherNames', e.target.value.toUpperCase())}
                    required
                    className="form-input"
                    placeholder="OTHER NAMES"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Matric Number *</label>
                <input
                  type="text"
                  value={form.matricNumber || ''}
                  onChange={e => set('matricNumber', e.target.value.toUpperCase())}
                  required
                  className="form-input"
                  placeholder="e.g. FUNATO/2023/001"
                />
              </div>
            </div>
          </div>

          {/* Academic Info */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="form-label">Department *</label>
              <select
                value={form.department || ''}
                onChange={e => set('department', e.target.value)}
                required
                className="form-input"
              >
                <option value="">Select Department</option>
                {DEPARTMENTS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
                <option value={form.department || ''}>{form.department || 'Other'}</option>
              </select>
            </div>

            <div>
              <label className="form-label">College</label>
              <select
                value={form.college || ''}
                onChange={e => set('college', e.target.value)}
                className="form-input"
              >
                <option value="">Select College (optional)</option>
                {COLLEGES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="form-label">Sex *</label>
              <select
                value={form.sex || ''}
                onChange={e => set('sex', e.target.value)}
                required
                className="form-input"
              >
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div>
              <label className="form-label">Blood Group</label>
              <select
                value={form.bloodGroup || ''}
                onChange={e => set('bloodGroup', e.target.value)}
                className="form-input"
              >
                <option value="">Select</option>
                {BLOOD_GROUPS.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Genotype</label>
              <select
                value={form.genotype || ''}
                onChange={e => set('genotype', e.target.value)}
                className="form-input"
              >
                <option value="">Select</option>
                {GENOTYPES.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Security String (read-only) */}
          <div>
            <label className="form-label">Security ID (Auto-generated)</label>
            <input
              type="text"
              value={form.securityString || ''}
              readOnly
              className="form-input bg-gray-50 text-gray-500 cursor-not-allowed font-mono"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 rounded-xl font-bold text-white transition-all active:scale-95 disabled:opacity-70"
              style={{ background: 'linear-gradient(135deg, #2d6a2d, #4a9e4a)' }}
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </span>
              ) : (
                '💾 Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
