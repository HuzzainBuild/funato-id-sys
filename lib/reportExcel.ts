// lib/reportExcel.ts
// Pure functions: data in, .xlsx Buffer out (no database access).
import * as XLSX from 'xlsx';
import type { BreakdownRow, ReportSummary, StudentExportRow } from './reportData';

type Cell = string | number;

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Africa/Lagos',
  dateStyle: 'medium',
  timeStyle: 'short',
});
const fmtDate = (d?: Date | string) => (d ? dateFmt.format(new Date(d)) : '');

function makeSheet(headers: string[], rows: Cell[][], preface: Cell[][] = []) {
  const aoa: Cell[][] = [...preface, headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  const widths = headers.map((h, col) => {
    const longest = rows.reduce(
      (max, r) => Math.max(max, String(r[col] ?? '').length),
      h.length,
    );
    return { wch: Math.min(Math.max(longest + 2, 8), 48) };
  });
  ws['!cols'] = widths;

  const headerRow = preface.length; // zero-indexed row of headers
  if (rows.length) {
    ws['!autofilter'] = {
      ref: XLSX.utils.encode_range(
        { r: headerRow, c: 0 },
        { r: headerRow + rows.length, c: headers.length - 1 },
      ),
    };
  }
  return ws;
}

const safeName = (name: string) => name.replace(/[\\/?*[\]:]/g, '-').slice(0, 31);

function addSheet(wb: XLSX.WorkBook, name: string, ws: XLSX.WorkSheet) {
  XLSX.utils.book_append_sheet(wb, ws, safeName(name));
}

function toBuffer(wb: XLSX.WorkBook): Buffer {
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

// ---------- Student lists ----------

const STUDENT_HEADERS = [
  'S/N',
  'Matric Number',
  'Surname',
  'Other Names',
  'Department',
  'College',
  'Sex',
  'Blood Group',
  'Genotype',
  'Session',
  'Passport Uploaded',
  'Print Status',
  'Times Printed',
  'Last Printed',
  'Import Batch',
  'Date Added',
];

function studentRows(rows: StudentExportRow[], batchNames: Map<string, string>): Cell[][] {
  return rows.map((s, i) => [
    i + 1,
    s.matricNumber,
    s.surname,
    s.otherNames,
    s.department,
    s.college,
    s.sex,
    s.bloodGroup,
    s.genotype,
    `${s.importYear}/${s.importYear + 1}`,
    s.hasPassport ? 'Yes' : 'No',
    s.printed ? 'Printed' : 'Not Printed',
    s.printCount,
    fmtDate(s.printedAt),
    batchNames.get(s.uploadId) || '',
    fmtDate(s.createdAt),
  ]);
}

function deptCountsSheet(rows: StudentExportRow[]) {
  const map = new Map<string, { college: string; count: number }>();
  rows.forEach((r) => {
    const cur = map.get(r.department) || { college: r.college, count: 0 };
    cur.count += 1;
    map.set(r.department, cur);
  });
  const body = Array.from(map.entries())
    .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))
    .map(([dept, v]) => [dept, v.college, v.count] as Cell[]);
  body.push(['TOTAL', '', rows.length]);
  return makeSheet(['Department', 'College', 'Students'], body);
}

export function buildStudentListWorkbook(
  sheetName: string,
  rows: StudentExportRow[],
  batchNames: Map<string, string>,
): Buffer {
  const wb = XLSX.utils.book_new();
  addSheet(wb, sheetName, makeSheet(STUDENT_HEADERS, studentRows(rows, batchNames)));
  addSheet(wb, 'By Department', deptCountsSheet(rows));
  return toBuffer(wb);
}

/** One workbook with an Unprinted sheet and a Printed sheet. */
export function buildCardStatusWorkbook(
  rows: StudentExportRow[],
  batchNames: Map<string, string>,
): Buffer {
  const unprinted = rows.filter((r) => !r.printed);
  const printed = rows.filter((r) => r.printed);
  const wb = XLSX.utils.book_new();
  addSheet(
    wb,
    'Unprinted',
    makeSheet(STUDENT_HEADERS, studentRows(unprinted, batchNames)),
  );
  addSheet(wb, 'Printed', makeSheet(STUDENT_HEADERS, studentRows(printed, batchNames)));
  addSheet(
    wb,
    'Summary',
    makeSheet(
      ['Status', 'Students'],
      [
        ['Printed', printed.length],
        ['Not Printed', unprinted.length],
        ['TOTAL', rows.length],
      ],
    ),
  );
  return toBuffer(wb);
}

/** Students that are missing data needed for a good ID card. */
export function buildIncompleteWorkbook(
  rows: StudentExportRow[],
  batchNames: Map<string, string>,
): Buffer {
  const incomplete = rows
    .map((s) => ({
      s,
      missing: [
        !s.hasPassport && 'Passport',
        ['N/A', ''].includes(s.bloodGroup) && 'Blood Group',
        ['N/A', ''].includes(s.genotype) && 'Genotype',
      ].filter(Boolean) as string[],
    }))
    .filter((x) => x.missing.length);

  const body = incomplete.map(({ s, missing }, i) => [
    i + 1,
    s.matricNumber,
    s.surname,
    s.otherNames,
    s.department,
    s.college,
    s.sex,
    missing.join(', '),
    s.printed ? 'Printed' : 'Not Printed',
    batchNames.get(s.uploadId) || '',
  ]);

  const wb = XLSX.utils.book_new();
  addSheet(
    wb,
    'Incomplete Records',
    makeSheet(
      [
        'S/N',
        'Matric Number',
        'Surname',
        'Other Names',
        'Department',
        'College',
        'Sex',
        'Missing',
        'Print Status',
        'Import Batch',
      ],
      body,
    ),
  );
  return toBuffer(wb);
}

// ---------- Full summary report ----------

const BREAKDOWN_HEADERS = ['', 'Total', 'Printed', 'Not Printed', '% Printed', 'Male', 'Female'];
const breakdownBody = (rows: BreakdownRow[]): Cell[][] => {
  const body = rows.map((r) => [r.label, r.total, r.printed, r.unprinted, r.pct, r.male, r.female]);
  const sum = (k: 'total' | 'printed' | 'unprinted' | 'male' | 'female') =>
    rows.reduce((n, r) => n + r[k], 0);
  const total = sum('total');
  body.push([
    'TOTAL',
    total,
    sum('printed'),
    sum('unprinted'),
    total ? Math.round((sum('printed') / total) * 1000) / 10 : 0,
    sum('male'),
    sum('female'),
  ]);
  return body;
};
const withLabel = (label: string) => [label, ...BREAKDOWN_HEADERS.slice(1)];

export function buildSummaryWorkbook(summary: ReportSummary, filterLabel: string): Buffer {
  const wb = XLSX.utils.book_new();
  const t = summary.totals;

  const overview: Cell[][] = [
    ['FUNATO Student ID Card Report'],
    ['Generated', fmtDate(summary.generatedAt)],
    ['Filters', filterLabel],
    [],
    ['Metric', 'Value'],
    ['Total students', t.total],
    ['Cards printed', t.printed],
    ['Cards not yet printed', t.unprinted],
    ['Print completion (%)', t.pct],
    ['Cards printed more than once', t.reprinted],
    ['Male', t.male],
    ['Female', t.female],
    [],
    ['Data quality', ''],
    ['Missing passport', summary.quality.missingPassport],
    ['Missing blood group', summary.quality.missingBloodGroup],
    ['Missing genotype', summary.quality.missingGenotype],
    ['Records with any missing field', summary.quality.incomplete],
  ];
  const ov = XLSX.utils.aoa_to_sheet(overview);
  ov['!cols'] = [{ wch: 34 }, { wch: 60 }];
  addSheet(wb, 'Overview', ov);

  addSheet(
    wb,
    'By College',
    makeSheet(withLabel('College'), breakdownBody(summary.byCollege)),
  );
  addSheet(
    wb,
    'By Department',
    makeSheet(
      ['Department', 'College', ...BREAKDOWN_HEADERS.slice(1)],
      [
        ...summary.byDepartment.map((r) => [
          r.label,
          r.college,
          r.total,
          r.printed,
          r.unprinted,
          r.pct,
          r.male,
          r.female,
        ]),
        [
          'TOTAL',
          '',
          t.total,
          t.printed,
          t.unprinted,
          t.pct,
          t.male,
          t.female,
        ],
      ],
    ),
  );
  addSheet(
    wb,
    'By Session',
    makeSheet(withLabel('Session'), breakdownBody(summary.bySession)),
  );
  addSheet(
    wb,
    'By Import Batch',
    makeSheet(
      ['Batch / File', 'Uploaded By', 'Uploaded On', 'Total', 'Printed', 'Not Printed', '% Printed'],
      summary.byBatch.map((b) => [
        b.fileName,
        b.uploadedBy,
        fmtDate(b.uploadedAt),
        b.total,
        b.printed,
        b.unprinted,
        b.pct,
      ]),
    ),
  );
  addSheet(
    wb,
    'Print Activity',
    makeSheet(
      ['Date', 'Cards Printed'],
      summary.activity.map((a) => [a.date, a.count]),
    ),
  );
  addSheet(
    wb,
    'Blood & Genotype',
    makeSheet(
      ['Blood Group', 'Students', '', 'Genotype', 'Students'],
      Array.from({ length: Math.max(summary.bloodGroups.length, summary.genotypes.length) }, (_, i) => [
        summary.bloodGroups[i]?.label ?? '',
        summary.bloodGroups[i]?.count ?? '',
        '',
        summary.genotypes[i]?.label ?? '',
        summary.genotypes[i]?.count ?? '',
      ]),
    ),
  );
  return toBuffer(wb);
}
