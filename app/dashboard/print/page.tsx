"use client";
// app/dashboard/print/page.tsx

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  Suspense,
} from "react";
import { useSearchParams } from "next/navigation";
import type { Student } from "@/types";
import { studentsApi } from "@/lib/apiClient";
import { useToast } from "@/hooks/useToast";
import dynamic from "next/dynamic";

const IDCardCanvas = dynamic(
  () => import("@/components/cards/IDCardCanvas"),
  { ssr: false },
);

// CR80 ID card size: one card per print/PDF page.
const ID_CARD_WIDTH_MM = 85.6;
const ID_CARD_HEIGHT_MM = 54;
const ID_CARD_PRINT_SCALE = 0.318;

function PrintPageContent() {
  const searchParams = useSearchParams();
  const toast = useToast();
  const toastError = toast.error;
  const printAreaRef = useRef<HTMLDivElement>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [renderCount, setRenderCount] = useState(0);
  const [exportingPdf, setExportingPdf] = useState(false);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const ids = searchParams.get("ids");
      const all = searchParams.get("all");

      if (all) {
        // Load all students (paginated batches)
        let page = 1;
        const allStudents: Student[] = [];
        while (true) {
          const data = await studentsApi.list({ page, limit: 100 });
          allStudents.push(...data.students);
          if (page >= data.pagination.pages) break;
          page++;
        }
        setStudents(allStudents);
      } else if (ids) {
        const idList = ids.split(",").filter(Boolean);
        const loadedStudents: Student[] = [];
        for (const id of idList) {
          try {
            const data = await studentsApi.get(id);
            if (data.student) loadedStudents.push(data.student);
          } catch {}
        }
        setStudents(loadedStudents);
      }
    } catch (err) {
      toastError("Failed to load students", (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [searchParams, toastError]);

  useEffect(() => {
    queueMicrotask(() => {
      loadStudents();
    });
  }, [loadStudents]);

  const isRendering = exportingPdf || generating;

  const handlePrint = () => {
    window.print();
    toast.info(
      "Print dialog opened",
      "Use card/custom paper size 85.6mm x 54mm, disable headers/footers",
    );
  };

  const handleExportPDF = async () => {
    if (students.length === 0) {
      toast.warning("No students selected", "Select students before exporting.");
      return;
    }

    setExportingPdf(true);
    setRenderCount(0);
    try {
      const jsPDF = (await import("jspdf")).default;
      const { renderIDCard } = await import("@/components/cards/IDCardCanvas");

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [ID_CARD_WIDTH_MM, ID_CARD_HEIGHT_MM],
      });

      for (let i = 0; i < students.length; i++) {
        const student = students[i];
        const cardDataUrl = await renderIDCard(student);

        if (i > 0) {
          pdf.addPage();
        }

        pdf.addImage(cardDataUrl, "PNG", 0, 0, ID_CARD_WIDTH_MM, ID_CARD_HEIGHT_MM);
        setRenderCount(i + 1);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      pdf.save(
        `FUNATO_ID_Cards_${new Date().toISOString().split("T")[0]}.pdf`,
      );
      toast.success(
        "PDF exported!",
        `${students.length} ID card pages saved to PDF`,
      );
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("PDF export failed", (err as Error).message);
    } finally {
      setExportingPdf(false);
    }
  };

  const handleDownloadAll = async () => {
    if (students.length === 0) {
      toast.warning("No students selected", "Select students before downloading.");
      return;
    }

    setGenerating(true);
    setRenderCount(0);
    try {
      const { renderIDCard } = await import("@/components/cards/IDCardCanvas");

      for (let i = 0; i < students.length; i++) {
        const student = students[i];
        const cardDataUrl = await renderIDCard(student);
        const a = document.createElement("a");
        a.href = cardDataUrl;
        a.download = `ID_${student.matricNumber}.png`;
        a.click();
        setRenderCount(i + 1);
        await new Promise((r) => setTimeout(r, 200));
      }
      toast.success("All cards downloaded!");
    } finally {
      setGenerating(false);
    }
  };

  const pages = students.length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 font-medium">
            Loading student data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "Lexend, sans-serif" }}>
      {/* Control Bar - no-print */}
      <div className="no-print sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-8 py-4">
          <div>
            <h1 className="text-xl font-extrabold text-gray-900">
              Print ID Cards
            </h1>
            <p className="text-sm text-gray-500">
              {students.length} cards · {pages} page
              {pages !== 1 ? "s" : ""}
              {!isRendering ? (
                <span className="ml-2 text-green-600 font-semibold">
                  ✓ All cards ready
                </span>
              ) : (
                <span className="ml-2 text-amber-500 font-semibold">
                  Rendering {renderCount}/{students.length}...
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadAll}
              disabled={students.length === 0 || generating || exportingPdf}
              className="px-4 py-2 text-sm font-bold rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {generating
                ? "⏳ Downloading..."
                : "⬇️ Download All PNG"}
            </button>

            <button
              onClick={handleExportPDF}
              disabled={students.length === 0 || exportingPdf || generating}
              className="px-4 py-2 text-sm font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {exportingPdf
                ? "⏳ Generating PDF..."
                : "📄 Export PDF"}
            </button>

            <button
              onClick={handlePrint}
              className="px-5 py-2 text-sm font-bold rounded-xl text-white"
              style={{
                background:
                  "linear-gradient(135deg, #2d6a2d, #4a9e4a)",
              }}
            >
              🖨️ Print
            </button>
          </div>
        </div>

        {/* Render Progress */}
        {isRendering && students.length > 0 && (
          <div className="px-8 pb-3">
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${(renderCount / students.length) * 100}%`,
                  background:
                    "linear-gradient(90deg, #2d6a2d, #4a9e4a)",
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Print Instructions (no-print) */}
      <div className="no-print bg-amber-50 border-b border-amber-200 px-8 py-3 flex items-center gap-3">
        <span className="text-amber-600 text-lg flex-shrink-0">
          💡
        </span>
        <p className="text-sm text-amber-800 font-medium">
          <strong>Print Settings:</strong> Set paper to custom/card size
          85.6mm x 54mm, margins to none/0, disable headers/footers, and
          enable background graphics.
        </p>
      </div>

      {students.length === 0 ? (
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="text-6xl mb-4">🪪</div>
            <p className="text-xl font-bold text-gray-600">
              No students selected
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Go back and select students to print
            </p>
          </div>
        </div>
      ) : (
        /* Print Area */
        <div
          id="print-area"
          ref={printAreaRef}
          className="bg-white"
          style={{ minHeight: "100vh" }}
        >
          {students.map((student, pageIdx) => (
              <div
                key={student._id || student.matricNumber}
                className="print-page"
                style={{
                  width: `${ID_CARD_WIDTH_MM}mm`,
                  height: `${ID_CARD_HEIGHT_MM}mm`,
                  padding: 0,
                  pageBreakAfter:
                    pageIdx < pages - 1 ? "always" : "auto",
                  boxSizing: "border-box",
                  margin: "12mm auto",
                  backgroundColor: "#fff",
                  overflow: "hidden",
                }}
              >
                {/* Page header (no-print) */}
                <div className="no-print mb-4 flex items-center justify-between">
                  <p className="text-xs text-gray-400 font-medium">
                    Page {pageIdx + 1} of {pages}
                  </p>
                  <p className="text-xs text-gray-400">
                    85.6mm x 54mm
                  </p>
                </div>

                <div className="print-card-frame">
                  <IDCardCanvas
                    student={student}
                    scale={ID_CARD_PRINT_SCALE}
                    renderForExport={false}
                  />
                </div>
              </div>
          ))}
        </div>
      )}

      {/* Print-only styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          html, body {
            width: ${ID_CARD_WIDTH_MM}mm;
            min-height: ${ID_CARD_HEIGHT_MM}mm;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }
          #print-area {
            width: ${ID_CARD_WIDTH_MM}mm;
            min-height: 0 !important;
            background: #fff !important;
          }
          .no-print { display: none !important; }
          .print-page {
            width: ${ID_CARD_WIDTH_MM}mm !important;
            height: ${ID_CARD_HEIGHT_MM}mm !important;
            min-height: ${ID_CARD_HEIGHT_MM}mm !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            page-break-after: always;
            break-after: page;
            page-break-inside: avoid;
            break-inside: avoid;
            overflow: hidden !important;
          }
          .print-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          .print-card-frame {
            width: ${ID_CARD_WIDTH_MM}mm;
            height: ${ID_CARD_HEIGHT_MM}mm;
            overflow: hidden;
          }
          .print-card-frame > div {
            border-radius: 0 !important;
            box-shadow: none !important;
          }
          @page {
            size: ${ID_CARD_WIDTH_MM}mm ${ID_CARD_HEIGHT_MM}mm;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}

export default function PrintPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
        </div>
      }
    >
      <PrintPageContent />
    </Suspense>
  );
}
