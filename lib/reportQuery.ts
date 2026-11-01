import mongoose from "mongoose";
import {
  COLLEGE_TEMPLATES,
  getDepartmentSearchValues,
  resolveCollegeTemplate,
} from "./cardTemplates";

export type PrintFilter = "printed" | "unprinted" | "";

export const UNPRINTED_CONDITION = {
  $or: [{ printedAt: { $exists: false } }, { printedAt: null }],
};
export const PRINTED_CONDITION = {
  printedAt: { $exists: true, $ne: null },
};

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const exact = (value: string) =>
  new RegExp(`^${escapeRegex(value)}$`, "i");

export function buildStudentFilter(
  sp: URLSearchParams,
  printedOverride?: PrintFilter,
): Record<string, unknown> {
  const and: Record<string, unknown>[] = [];

  const department = sp.get("department") || "";
  const college = sp.get("college") || "";
  const year = sp.get("year") || "";
  const sex = sp.get("sex") || "";
  const uploadId = sp.get("uploadId") || "";
  const from = sp.get("from") || "";
  const to = sp.get("to") || "";
  const printed =
    printedOverride ?? ((sp.get("printed") || "") as PrintFilter);

  if (department) {
    and.push({
      department: {
        $in: getDepartmentSearchValues(department).map(exact),
      },
    });
  }

  if (college) {
    const template = resolveCollegeTemplate(college);
    const known = Object.values(COLLEGE_TEMPLATES).some(
      (t) => t.key === template.key && t.college === template.college,
    );
    const departmentValues = known
      ? Array.from(
          new Set(
            template.departments.flatMap((d) =>
              getDepartmentSearchValues(d),
            ),
          ),
        )
      : [];
    and.push({
      $or: [
        { college: exact(college) },
        ...(departmentValues.length
          ? [{ department: { $in: departmentValues.map(exact) } }]
          : []),
      ],
    });
  }

  const yearNum = parseInt(year, 10);
  if (Number.isFinite(yearNum)) and.push({ importYear: yearNum });

  if (sex === "Male" || sex === "Female") and.push({ sex });

  if (uploadId === "manual") {
    and.push({
      $or: [
        { uploadRecordId: { $exists: false } },
        { uploadRecordId: null },
      ],
    });
  } else if (uploadId && mongoose.Types.ObjectId.isValid(uploadId)) {
    and.push({
      uploadRecordId: new mongoose.Types.ObjectId(uploadId),
    });
  }

  const dateRange: Record<string, Date> = {};
  if (from && !Number.isNaN(Date.parse(from)))
    dateRange.$gte = new Date(from);
  if (to && !Number.isNaN(Date.parse(to))) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    dateRange.$lte = end;
  }
  if (Object.keys(dateRange).length)
    and.push({ createdAt: dateRange });

  if (printed === "unprinted") and.push(UNPRINTED_CONDITION);
  else if (printed === "printed") and.push(PRINTED_CONDITION);

  return and.length ? { $and: and } : {};
}

/** Human-readable description of the active filters, shown inside the Excel report. */
export function describeFilters(sp: URLSearchParams): string {
  const parts: string[] = [];
  const add = (label: string, key: string) => {
    const v = sp.get(key);
    if (v) parts.push(`${label}: ${v}`);
  };
  add("College", "college");
  add("Department", "department");
  add("Session", "year");
  add("Sex", "sex");
  add("From", "from");
  add("To", "to");
  if (sp.get("uploadId"))
    parts.push(`Batch: ${sp.get("batchName") || sp.get("uploadId")}`);
  return parts.length ? parts.join(" | ") : "None (all students)";
}
