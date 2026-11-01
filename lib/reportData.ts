// lib/reportData.ts
import mongoose from 'mongoose';
import type { PipelineStage } from 'mongoose';
import Student from '../models/Student';
import UploadRecord from '../models/UploadRecord';
import { canonicalizeDepartment, resolveStudentCollege } from './cardTemplates';

type Match = Record<string, unknown>;

export interface BreakdownRow {
  label: string;
  total: number;
  printed: number;
  unprinted: number;
  pct: number; // printed %, 1 decimal
  male: number;
  female: number;
}
export interface DepartmentRow extends BreakdownRow {
  college: string;
}
export interface BatchRow extends BreakdownRow {
  uploadId: string; // 'manual' for students added one by one
  fileName: string;
  uploadedBy: string;
  uploadedAt: string;
}
export interface ReportSummary {
  generatedAt: string;
  totals: {
    total: number;
    printed: number;
    unprinted: number;
    reprinted: number;
    pct: number;
    male: number;
    female: number;
  };
  byCollege: BreakdownRow[];
  byDepartment: DepartmentRow[];
  bySession: BreakdownRow[];
  byBatch: BatchRow[];
  bloodGroups: { label: string; count: number }[];
  genotypes: { label: string; count: number }[];
  quality: {
    missingPassport: number;
    missingBloodGroup: number;
    missingGenotype: number;
    incomplete: number;
  };
  activity: { date: string; count: number }[]; // last 30 active print days
}

export interface StudentExportRow {
  matricNumber: string;
  surname: string;
  otherNames: string;
  department: string;
  college: string;
  sex: string;
  bloodGroup: string;
  genotype: string;
  importYear: number;
  hasPassport: boolean;
  printed: boolean;
  printCount: number;
  printedAt?: Date;
  createdAt?: Date;
  uploadId: string;
}

const pct = (part: number, whole: number) =>
  whole ? Math.round((part / whole) * 1000) / 10 : 0;

// Server-side check so base64 passport data is never pulled into Node memory.
const HAS_PASSPORT = {
  $or: [
    { $gt: [{ $strLenCP: { $ifNull: ['$passportUrl', ''] } }, 0] },
    { $gt: [{ $strLenCP: { $ifNull: ['$passportData', ''] } }, 0] },
  ],
};
const NO_PASSPORT = { $not: [HAS_PASSPORT] };
const NO_BLOOD = { $in: [{ $ifNull: ['$bloodGroup', 'N/A'] }, ['N/A', '']] };
const NO_GENO = { $in: [{ $ifNull: ['$genotype', 'N/A'] }, ['N/A', '']] };
const IS_PRINTED = { $cond: [{ $ifNull: ['$printedAt', false] }, 1, 0] };
const sumIf = (cond: unknown) => ({ $sum: { $cond: [cond, 1, 0] } });

function emptyRow(label: string): BreakdownRow {
  return { label, total: 0, printed: 0, unprinted: 0, pct: 0, male: 0, female: 0 };
}
function finish<T extends BreakdownRow>(row: T): T {
  row.unprinted = row.total - row.printed;
  row.pct = pct(row.printed, row.total);
  return row;
}

export async function loadSummary(match: Match): Promise<ReportSummary> {
  const withMatch = (...stages: PipelineStage[]): PipelineStage[] => [
    { $match: match } as PipelineStage,
    ...stages,
  ];

  const [core, years, batches, blood, geno, quality, activity, reprinted] = await Promise.all([
    Student.aggregate(
      withMatch({
        $group: {
          _id: { department: '$department', college: '$college', sex: '$sex' },
          total: { $sum: 1 },
          printed: { $sum: IS_PRINTED },
        },
      }),
    ),
    Student.aggregate(
      withMatch(
        {
          $group: {
            _id: '$importYear',
            total: { $sum: 1 },
            printed: { $sum: IS_PRINTED },
            male: sumIf({ $eq: ['$sex', 'Male'] }),
            female: sumIf({ $eq: ['$sex', 'Female'] }),
          },
        },
        { $sort: { _id: -1 } },
      ),
    ),
    Student.aggregate(
      withMatch({
        $group: {
          _id: '$uploadRecordId',
          total: { $sum: 1 },
          printed: { $sum: IS_PRINTED },
          male: sumIf({ $eq: ['$sex', 'Male'] }),
          female: sumIf({ $eq: ['$sex', 'Female'] }),
        },
      }),
    ),
    Student.aggregate(
      withMatch(
        { $group: { _id: { $ifNull: ['$bloodGroup', 'N/A'] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ),
    ),
    Student.aggregate(
      withMatch(
        { $group: { _id: { $ifNull: ['$genotype', 'N/A'] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ),
    ),
    Student.aggregate(
      withMatch({
        $group: {
          _id: null,
          missingPassport: sumIf(NO_PASSPORT),
          missingBloodGroup: sumIf(NO_BLOOD),
          missingGenotype: sumIf(NO_GENO),
          incomplete: sumIf({ $or: [NO_PASSPORT, NO_BLOOD, NO_GENO] }),
        },
      }),
    ),
    Student.aggregate([
      { $match: { $and: [match, { printedAt: { $exists: true, $ne: null } }] } } as PipelineStage,
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$printedAt', timezone: 'Africa/Lagos' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: 30 },
      { $sort: { _id: 1 } },
    ]),
    Student.countDocuments({ $and: [match, { printCount: { $gt: 1 } }] }),
  ]);

  // ---- Core breakdowns (college / department / sex), merged by canonical name ----
  const totals = { ...emptyRow('Total') };
  const colleges = new Map<string, BreakdownRow>();
  const departments = new Map<string, DepartmentRow>();

  for (const g of core as {
    _id: { department?: string; college?: string; sex?: string };
    total: number;
    printed: number;
  }[]) {
    const dept = canonicalizeDepartment(g._id.department || '') || 'Unspecified';
    const college = resolveStudentCollege(g._id.college, g._id.department);
    const isMale = g._id.sex === 'Male';
    const isFemale = g._id.sex === 'Female';

    const apply = (row: BreakdownRow) => {
      row.total += g.total;
      row.printed += g.printed;
      if (isMale) row.male += g.total;
      if (isFemale) row.female += g.total;
    };

    apply(totals);
    if (!colleges.has(college)) colleges.set(college, emptyRow(college));
    apply(colleges.get(college)!);
    if (!departments.has(dept)) {
      departments.set(dept, { ...emptyRow(dept), college });
    }
    apply(departments.get(dept)!);
  }

  const byTotalDesc = (a: BreakdownRow, b: BreakdownRow) =>
    b.total - a.total || a.label.localeCompare(b.label);

  // ---- Sessions ----
  const bySession = (years as { _id: number; total: number; printed: number; male: number; female: number }[]).map(
    (y) =>
      finish({
        label: `${y._id}/${y._id + 1}`,
        total: y.total,
        printed: y.printed,
        unprinted: 0,
        pct: 0,
        male: y.male,
        female: y.female,
      }),
  );

  // ---- Batches ----
  const batchIds = (batches as { _id: mongoose.Types.ObjectId | null }[])
    .map((b) => b._id)
    .filter((id): id is mongoose.Types.ObjectId => !!id);
  const uploadDocs = batchIds.length
    ? await UploadRecord.find({ _id: { $in: batchIds } })
        .select('originalName fileName uploadedByName createdAt')
        .lean()
    : [];
  const uploadMap = new Map(uploadDocs.map((u) => [String(u._id), u]));

  const byBatch: BatchRow[] = (
    batches as {
      _id: mongoose.Types.ObjectId | null;
      total: number;
      printed: number;
      male: number;
      female: number;
    }[]
  )
    .map((b) => {
      const upload = b._id ? uploadMap.get(String(b._id)) : undefined;
      const name = b._id
        ? upload?.originalName || upload?.fileName || 'Deleted batch'
        : 'Manually added';
      return finish({
        label: name,
        uploadId: b._id ? String(b._id) : 'manual',
        fileName: name,
        uploadedBy: upload?.uploadedByName || (b._id ? '' : '—'),
        uploadedAt: upload?.createdAt ? new Date(upload.createdAt).toISOString() : '',
        total: b.total,
        printed: b.printed,
        unprinted: 0,
        pct: 0,
        male: b.male,
        female: b.female,
      });
    })
    .sort((a, b) => (b.uploadedAt || '').localeCompare(a.uploadedAt || ''));

  const q = (quality as Record<string, number>[])[0] || {};

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      total: totals.total,
      printed: totals.printed,
      unprinted: totals.total - totals.printed,
      reprinted: reprinted as number,
      pct: pct(totals.printed, totals.total),
      male: totals.male,
      female: totals.female,
    },
    byCollege: Array.from(colleges.values()).map(finish).sort(byTotalDesc),
    byDepartment: Array.from(departments.values()).map(finish).sort(byTotalDesc),
    bySession,
    byBatch,
    bloodGroups: (blood as { _id: string; count: number }[]).map((b) => ({
      label: b._id || 'N/A',
      count: b.count,
    })),
    genotypes: (geno as { _id: string; count: number }[]).map((g) => ({
      label: g._id || 'N/A',
      count: g.count,
    })),
    quality: {
      missingPassport: q.missingPassport || 0,
      missingBloodGroup: q.missingBloodGroup || 0,
      missingGenotype: q.missingGenotype || 0,
      incomplete: q.incomplete || 0,
    },
    activity: (activity as { _id: string; count: number }[]).map((a) => ({
      date: a._id,
      count: a.count,
    })),
  };
}

/** Student rows for Excel export. Passport/QR blobs are never loaded. */
export async function loadStudentRows(match: Match): Promise<StudentExportRow[]> {
  const docs = await Student.aggregate([
    { $match: match } as PipelineStage,
    {
      $project: {
        surname: 1,
        otherNames: 1,
        matricNumber: 1,
        department: 1,
        college: 1,
        sex: 1,
        bloodGroup: 1,
        genotype: 1,
        importYear: 1,
        uploadRecordId: 1,
        printedAt: 1,
        printCount: 1,
        createdAt: 1,
        hasPassport: HAS_PASSPORT,
      },
    },
  ]).allowDiskUse(true);

  const rows: StudentExportRow[] = docs.map((d) => {
    const department = canonicalizeDepartment(d.department || '');
    return {
      matricNumber: d.matricNumber || '',
      surname: d.surname || '',
      otherNames: d.otherNames || '',
      department,
      college: resolveStudentCollege(d.college, d.department),
      sex: d.sex || '',
      bloodGroup: d.bloodGroup || 'N/A',
      genotype: d.genotype || 'N/A',
      importYear: d.importYear,
      hasPassport: !!d.hasPassport,
      printed: !!d.printedAt,
      printCount: d.printCount || 0,
      printedAt: d.printedAt || undefined,
      createdAt: d.createdAt || undefined,
      uploadId: d.uploadRecordId ? String(d.uploadRecordId) : 'manual',
    };
  });

  rows.sort(
    (a, b) =>
      a.college.localeCompare(b.college) ||
      a.department.localeCompare(b.department) ||
      a.surname.localeCompare(b.surname) ||
      a.otherNames.localeCompare(b.otherNames),
  );
  return rows;
}

export async function loadBatchNames(rows: StudentExportRow[]): Promise<Map<string, string>> {
  const ids = Array.from(new Set(rows.map((r) => r.uploadId))).filter((id) =>
    mongoose.Types.ObjectId.isValid(id),
  );
  const names = new Map<string, string>([['manual', 'Manually added']]);
  if (!ids.length) return names;
  const docs = await UploadRecord.find({ _id: { $in: ids } })
    .select('originalName fileName')
    .lean();
  docs.forEach((d) => names.set(String(d._id), d.originalName || d.fileName));
  return names;
}
