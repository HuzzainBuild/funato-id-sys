"use client";
// app/dashboard/import/page.tsx

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ToastContainer, useToast } from "@/hooks/useToast";

interface ImportResult {
  total: number;
  imported: number;
  duplicates: number;
  errors: number;
  errorDetails: { row: number; message: string }[];
  uploadId: string;
}

export default function ImportPage() {
  const router = useRouter();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover")
      setDragActive(true);
    else setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) validateAndSetFile(droppedFile);
  }, []);

  const validateAndSetFile = (f: File) => {
    const validTypes = [".xlsx", ".xls", ".csv"];
    const ext = "." + f.name.split(".").pop()?.toLowerCase();
    if (!validTypes.includes(ext)) {
      setError(
        "Invalid file type. Please upload .xlsx, .xls, or .csv files",
      );
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("File too large. Maximum size is 10MB");
      return;
    }
    setError("");
    setFile(f);
    setResult(null);
  };

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const f = e.target.files?.[0];
    if (f) validateAndSetFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    setError("");

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress((p) => (p < 85 ? p + Math.random() * 15 : p));
    }, 300);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const token = localStorage.getItem("auth-token");
      const res = await fetch("/api/upload/excel", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      clearInterval(progressInterval);
      setProgress(100);

      if (data.success || data.result) {
        setResult(data.result);
        if (data.result.imported > 0) {
          toast.success(
            `Import Complete! ${data.result.imported} students imported.`,
          );
        }
      } else {
        setError(data.message || "Import failed");
        toast.error("Import Failed", data.message);
      }
    } catch (err) {
      clearInterval(progressInterval);
      const msg = (err as Error).message;
      setError(msg);
      toast.error("Upload Error", msg);
    } finally {
      setUploading(false);
    }
  };

  const downloadSample = async () => {
    try {
      const token = localStorage.getItem("auth-token");
      const res = await fetch("/api/upload/sample", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "FUNATO_Student_Import_Template.xlsx";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Sample template downloaded!");
    } catch {
      toast.error("Download failed");
    }
  };

  const resetImport = () => {
    setFile(null);
    setResult(null);
    setError("");
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div
      className="p-8 max-w-6xl"
      style={{ fontFamily: "Lexend, sans-serif" }}
    >
      <ToastContainer
        toasts={toast.toasts}
        onRemove={toast.removeToast}
      />

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-1">
          Import Students
        </h1>
        <p className="text-gray-500 font-medium">
          Upload Excel files exported from Google Forms or prepared
          manually
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Upload Area */}
        <div className="lg:col-span-2 space-y-5">
          {/* Dropzone */}
          <div
            className={`relative border-2 border-dashed rounded-3xl p-10 text-center transition-all duration-300 cursor-pointer ${
              dragActive
                ? "border-green-500 bg-green-50 scale-[1.01]"
                : file
                  ? "border-green-400 bg-green-50/50"
                  : "border-gray-200 bg-white hover:border-green-400 hover:bg-green-50/30"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />

            {file ? (
              <div>
                <div className="text-5xl mb-4">📊</div>
                <p className="text-xl font-extrabold text-gray-900 mb-1">
                  {file.name}
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  {(file.size / 1024).toFixed(1)} KB · Ready to import
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    resetImport();
                  }}
                  className="text-sm text-red-500 hover:text-red-700 font-semibold underline"
                >
                  Remove file
                </button>
              </div>
            ) : (
              <div>
                <div className="text-5xl mb-4">
                  {dragActive ? "📂" : "📥"}
                </div>
                <p className="text-xl font-extrabold text-gray-700 mb-2">
                  {dragActive
                    ? "Drop your file here"
                    : "Drag & Drop Excel File"}
                </p>
                <p className="text-gray-400 text-sm mb-4">
                  or click to browse your files
                </p>
                <span className="inline-flex items-center gap-1 text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-lg font-medium">
                  Supports: .xlsx · .xls · .csv (max 10MB)
                </span>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
              <span className="text-red-500 text-xl shrink-0">
                ❌
              </span>
              <div>
                <p className="text-red-700 font-semibold text-sm">
                  Import Error
                </p>
                <p className="text-red-600 text-sm mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {uploading && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-700">
                  Processing file...
                </p>
                <p className="text-sm font-bold text-green-600">
                  {Math.round(progress)}%
                </p>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${progress}%`,
                    background:
                      "linear-gradient(90deg, #2d6a2d, #4a9e4a)",
                  }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Parsing data, checking duplicates, saving to
                database...
              </p>
            </div>
          )}

          {/* Import Result */}
          {result && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div
                className="px-5 py-4 flex items-center gap-3"
                style={{
                  background:
                    "linear-gradient(135deg, #2d6a2d, #4a9e4a)",
                }}
              >
                <span className="text-2xl">📋</span>
                <div>
                  <p className="text-white font-extrabold">
                    Import Complete
                  </p>
                  <p className="text-white/70 text-sm">
                    Processing finished successfully
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-4 divide-x divide-gray-100 p-0">
                {[
                  {
                    label: "Total Rows",
                    value: result.total,
                    color: "#374151",
                    icon: "📄",
                  },
                  {
                    label: "Imported",
                    value: result.imported,
                    color: "#16a34a",
                    icon: "✅",
                  },
                  {
                    label: "Duplicates",
                    value: result.duplicates,
                    color: "#d97706",
                    icon: "⚠️",
                  },
                  {
                    label: "Errors",
                    value: result.errors,
                    color: "#dc2626",
                    icon: "❌",
                  },
                ].map((stat) => (
                  <div key={stat.label} className="p-4 text-center">
                    <div className="text-2xl mb-1">{stat.icon}</div>
                    <p
                      className="text-2xl font-extrabold"
                      style={{ color: stat.color }}
                    >
                      {stat.value}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>

              {result.errorDetails.length > 0 && (
                <div className="border-t border-gray-100 p-4">
                  <p className="text-sm font-bold text-gray-700 mb-3">
                    ⚠️ Import Issues ({result.errorDetails.length}{" "}
                    rows):
                  </p>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {result.errorDetails.map((err, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 text-xs"
                      >
                        <span className="font-bold text-red-500 shrink-0">
                          Row {err.row}:
                        </span>
                        <span className="text-gray-600">
                          {err.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-gray-100 p-4 flex gap-3">
                <button
                  onClick={resetImport}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors text-sm"
                >
                  Import Another File
                </button>
                <button
                  onClick={() => router.push("/dashboard/students")}
                  className="flex-1 py-2.5 rounded-xl font-bold text-white text-sm"
                  style={{
                    background:
                      "linear-gradient(135deg, #2d6a2d, #4a9e4a)",
                  }}
                >
                  View Students →
                </button>
              </div>
            </div>
          )}

          {/* Upload Button */}
          {file && !result && (
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full py-4 rounded-2xl font-bold text-white text-base transition-all active:scale-95 disabled:opacity-70"
              style={{
                background:
                  "linear-gradient(135deg, #2d6a2d, #4a9e4a)",
              }}
            >
              {uploading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Importing students...
                </span>
              ) : (
                "📥 Start Import"
              )}
            </button>
          )}
        </div>

        {/* Sidebar: Instructions */}
        <div className="space-y-5">
          {/* Column Guide */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-extrabold text-gray-900 mb-3">
              📌 Required Columns
            </h3>
            <div className="space-y-2">
              {[
                { col: "Surname", req: true, note: "Family name" },
                {
                  col: "Other Names",
                  req: true,
                  note: "First + middle names",
                },
                {
                  col: "Matric Number",
                  req: true,
                  note: "Unique ID",
                },
                {
                  col: "Department",
                  req: true,
                  note: "Academic department",
                },
                { col: "Sex", req: false, note: "Male / Female" },
                {
                  col: "Blood Group",
                  req: false,
                  note: "e.g. O+, A-",
                },
                {
                  col: "Genotype",
                  req: false,
                  note: "AA, AS, SS...",
                },
                {
                  col: "College",
                  req: false,
                  note: "Faculty/College",
                },
              ].map(({ col, req, note }) => (
                <div
                  key={col}
                  className="flex items-start gap-2 text-sm"
                >
                  <span
                    className={`mt-0.5 shrink-0 w-4 h-4 rounded-full text-xs flex items-center justify-center font-bold ${
                      req
                        ? "bg-red-100 text-red-600"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {req ? "!" : "?"}
                  </span>
                  <div>
                    <span className="font-semibold text-gray-800">
                      {col}
                    </span>
                    <span className="text-gray-400 text-xs ml-1">
                      — {note}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-red-500 mt-3 font-medium">
              ! = Required · ? = Optional
            </p>
          </div>

          {/* Tips */}
          <div className="bg-linear-to-br from-green-700 to-green-900 rounded-2xl p-5 text-white">
            <h3 className="font-extrabold mb-3">💡 Import Tips</h3>
            <ul className="space-y-2 text-sm text-white/80">
              <li>• First row must be column headers</li>
              <li>• Duplicate matric numbers are skipped</li>
              <li>• Names are auto-converted to uppercase</li>
              <li>• Security IDs are auto-generated</li>
              <li>• Max 10MB file size</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
