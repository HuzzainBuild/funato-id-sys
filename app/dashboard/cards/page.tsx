"use client";
// app/dashboard/cards/page.tsx

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { COLLEGES, DEPARTMENTS, type Student } from "@/types";
import { studentsApi } from "@/lib/apiClient";
import { ToastContainer, useToast } from "@/hooks/useToast";
import dynamic from "next/dynamic";

const IDCardCanvas = dynamic(
  () => import("@/components/cards/IDCardCanvas"),
  { ssr: false },
);

function CardsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const toastError = toast.error;
  const focusId = searchParams.get("id");

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [college, setCollege] = useState("");
  const [department, setDepartment] = useState("");
  const [year, setYear] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedStudent, setSelectedStudent] =
    useState<Student | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(),
  );
  const [generating, setGenerating] = useState(false);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        page,
        limit: 50,
      };
      if (search) params.search = search;
      if (college) params.college = college;
      if (department) params.department = department;
      if (year) params.year = year;

      const data = await studentsApi.list(params);
      setStudents(data.students);
      setTotal(data.pagination.total);
      setPages(data.pagination.pages);

      if (focusId) {
        const focused = data.students.find((s) => s._id === focusId);
        if (focused) setSelectedStudent(focused);
      }
    } catch (err) {
      toastError("Failed to load", (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, search, college, department, year, focusId, toastError]);

  useEffect(() => {
    queueMicrotask(() => {
      fetchStudents();
    });
  }, [fetchStudents]);

  const handlePrintSelected = () => {
    if (selectedIds.size === 0) {
      toast.warning(
        "No cards selected",
        "Please select at least one student",
      );
      return;
    }
    const ids = Array.from(selectedIds).join(",");
    router.push(`/dashboard/print?ids=${ids}`);
  };

  const handlePrintAll = () => {
    const params = new URLSearchParams({ all: "1" });
    if (search) params.set("search", search);
    if (college) params.set("college", college);
    if (department) params.set("department", department);
    if (year) params.set("year", year);
    router.push(`/dashboard/print?${params.toString()}`);
  };

  const handlePrintSingle = (student: Student) => {
    router.push(`/dashboard/print?ids=${student._id}`);
  };

  const downloadCard = async (student: Student) => {
    setGenerating(true);
    try {
      const { renderIDCard } =
        await import("@/components/cards/IDCardCanvas");
      const dataUrl = await renderIDCard(student);
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `ID_Card_${student.matricNumber}.png`;
      a.click();
      toast.success(
        "Card downloaded!",
        `${student.surname}'s ID card saved as PNG`,
      );
    } catch (err) {
      toast.error("Download failed", (err as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === students.length)
      setSelectedIds(new Set());
    else setSelectedIds(new Set(students.map((s) => s._id!)));
  };

  return (
    <div className="p-8" style={{ fontFamily: "Lexend, sans-serif" }}>
      <ToastContainer
        toasts={toast.toasts}
        onRemove={toast.removeToast}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-1">
            ID Cards
          </h1>
          <p className="text-gray-500 font-medium">
            Preview and generate student ID cards ·{" "}
            {total.toLocaleString()} total
          </p>
        </div>
        <div className="flex gap-3">
          {selectedIds.size > 0 && (
            <button
              onClick={handlePrintSelected}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors text-sm"
            >
              🖨️ Print {selectedIds.size} Selected
            </button>
          )}
          <button
            onClick={handlePrintAll}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-white font-bold rounded-xl text-sm"
            style={{
              background: "linear-gradient(135deg, #2d6a2d, #4a9e4a)",
            }}
          >
            🖨️ Print All
          </button>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Left: Student grid */}
        <div className="flex-1 min-w-0">
          {/* Filters */}
          <div className="flex gap-3 mb-5">
            <input
              type="text"
              placeholder="🔍  Search students..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="form-input flex-1"
            />
            <select
              value={college}
              onChange={(e) => {
                setCollege(e.target.value);
                setPage(1);
              }}
              className="form-input w-56"
            >
              <option value="">All Colleges</option>
              {COLLEGES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={department}
              onChange={(e) => {
                setDepartment(e.target.value);
                setPage(1);
              }}
              className="form-input w-48"
            >
              <option value="">All Departments</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => {
                setYear(e.target.value);
                setPage(1);
              }}
              className="form-input w-32"
            >
              <option value="">All Years</option>
              {Array.from(
                { length: 5 },
                (_, i) => new Date().getFullYear() - i,
              ).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Select All bar */}
          {students.length > 0 && (
            <div className="flex items-center justify-between mb-4 px-1">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-600">
                <input
                  type="checkbox"
                  checked={selectedIds.size === students.length}
                  onChange={selectAll}
                  className="w-4 h-4 accent-green-600"
                />
                Select All ({students.length})
              </label>
              {selectedIds.size > 0 && (
                <span className="text-sm text-green-600 font-bold">
                  {selectedIds.size} selected
                </span>
              )}
            </div>
          )}

          {/* Cards Grid */}
          {loading ? (
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-gray-100 h-52 animate-pulse"
                />
              ))}
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-2xl border border-gray-100">
              <div className="text-6xl mb-4">🪪</div>
              <p className="text-xl font-extrabold text-gray-700 mb-2">
                No Students Found
              </p>
              <p className="text-gray-400 text-sm mb-5">
                Import student data to generate ID cards
              </p>
              <button
                onClick={() => router.push("/dashboard/import")}
                className="px-6 py-3 rounded-xl font-bold text-white text-sm"
                style={{ background: "#2d6a2d" }}
              >
                Import Excel Data
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {students.map((student) => (
                <StudentCardItem
                  key={student._id}
                  student={student}
                  selected={selectedIds.has(student._id!)}
                  focused={selectedStudent?._id === student._id}
                  onSelect={() => toggleSelect(student._id!)}
                  onPreview={() => setSelectedStudent(student)}
                  onDownload={() => downloadCard(student)}
                  onPrint={() => handlePrintSingle(student)}
                  generating={generating}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                ← Prev
              </button>
              {Array.from(
                { length: Math.min(5, pages) },
                (_, i) => i + 1,
              ).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-9 h-9 text-sm font-bold rounded-xl transition-colors ${
                    p === page
                      ? "text-white"
                      : "border border-gray-200 hover:bg-gray-50"
                  }`}
                  style={p === page ? { background: "#2d6a2d" } : {}}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </div>

        {/* Right: ID Card Preview Panel */}
        <div className="w-96 shrink-0">
          <div className="sticky top-8">
            <h2 className="text-lg font-extrabold text-gray-900 mb-4">
              Card Preview
            </h2>

            {selectedStudent ? (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-extrabold text-gray-900 text-sm">
                      {selectedStudent.surname}{" "}
                      {selectedStudent.otherNames}
                    </p>
                    <p className="text-xs text-gray-500">
                      {selectedStudent.matricNumber}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedStudent(null)}
                    className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-400 transition-colors text-sm"
                  >
                    ✕
                  </button>
                </div>

                {/* The actual ID Card */}
                <div className="flex justify-center mb-4">
                  <IDCardCanvas
                    student={selectedStudent}
                    scale={0.4}
                  />
                </div>

                {/* Security String */}
                <div className="bg-gray-900 rounded-xl p-3 mb-4 text-center">
                  <p className="text-xs text-gray-400 mb-1">
                    Security ID
                  </p>
                  <p className="font-mono text-sm font-bold text-amber-400 tracking-widest">
                    {selectedStudent.securityString}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => downloadCard(selectedStudent)}
                    disabled={generating}
                    className="py-2.5 rounded-xl text-sm font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
                  >
                    {generating ? "⏳" : "⬇️"} PNG
                  </button>
                  <button
                    onClick={() => handlePrintSingle(selectedStudent)}
                    className="py-2.5 rounded-xl text-sm font-bold text-white transition-colors"
                    style={{ background: "#2d6a2d" }}
                  >
                    🖨️ Print Card
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center">
                <div className="text-5xl mb-3">🪪</div>
                <p className="font-semibold text-gray-500 text-sm">
                  Click any student card to preview their ID card here
                </p>
              </div>
            )}

            {/* Quick stats */}
            <div className="mt-5 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-extrabold text-gray-800 text-sm mb-3">
                Quick Info
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Card Size</span>
                  <span className="font-semibold">
                    85.6mm × 54mm (CR80)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Resolution</span>
                  <span className="font-semibold">
                    300 DPI (print ready)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Cards per A4</span>
                  <span className="font-semibold">
                    8 (2×4 layout)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">
                    QR Error Corr.
                  </span>
                  <span className="font-semibold">High (H)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Output Format</span>
                  <span className="font-semibold">PNG / PDF</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StudentCardItem({
  student,
  selected,
  focused,
  onSelect,
  onPreview,
  onDownload,
  onPrint,
  generating,
}: {
  student: Student;
  selected: boolean;
  focused: boolean;
  onSelect: () => void;
  onPreview: () => void;
  onDownload: () => void;
  onPrint: () => void;
  generating: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer ${
        focused
          ? "border-green-500 ring-2 ring-green-200"
          : selected
            ? "border-green-400 bg-green-50/30"
            : "border-gray-100"
      }`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div
            className="flex items-center gap-3"
            onClick={onPreview}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm shrink-0 overflow-hidden"
              style={{
                background:
                  "linear-gradient(135deg, #2d6a2d, #4a9e4a)",
              }}
            >
              {student.passportUrl || student.passportData ? (
                <img
                  src={student.passportUrl || student.passportData}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                student.surname[0]
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-gray-900">
                {student.surname} {student.otherNames}
              </p>
              <p className="text-xs text-gray-500 ">
                {student.department}
              </p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={selected}
            onChange={onSelect}
            className="w-4 h-4 accent-green-600 mt-1 shrink-0"
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-4">
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-gray-100 flex items-center justify-center">
              🎓
            </span>
            <span className="font-mono font-semibold truncate">
              {student.matricNumber}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-gray-100 flex items-center justify-center">
              {student.sex === "Male" ? "♂" : "♀"}
            </span>
            <span>{student.sex}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-gray-100 flex items-center justify-center">
              🩸
            </span>
            <span>
              {student.bloodGroup} / {student.genotype}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-gray-100 flex items-center justify-center">
              📸
            </span>
            <span
              className={
                student.passportUrl || student.passportData
                  ? "text-green-600 font-semibold"
                  : "text-gray-400"
              }
            >
              {student.passportUrl || student.passportData
                ? "Photo ✓"
                : "No photo"}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onPreview}
            className="flex-1 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            👁 Preview
          </button>
          <button
            onClick={onDownload}
            disabled={generating}
            className="flex-1 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            ⬇️ PNG
          </button>
          <button
            onClick={onPrint}
            className="flex-1 py-2 rounded-xl text-xs font-bold text-white transition-colors"
            style={{ background: "#2d6a2d" }}
          >
            🖨️ Print
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CardsPage() {
  return (
    <Suspense
      fallback={<div className="p-8 text-gray-400">Loading...</div>}
    >
      <CardsPageContent />
    </Suspense>
  );
}
