// app/api/reports/export/route.ts
// GET /api/reports/export?type=report|printed|unprinted|cards|incomplete
// Optional filters: college, department, year, sex, uploadId, from, to
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';
import { buildStudentFilter, describeFilters, type PrintFilter } from '@/lib/reportQuery';
import { loadBatchNames, loadStudentRows, loadSummary } from '@/lib/reportData';
import {
  buildCardStatusWorkbook,
  buildIncompleteWorkbook,
  buildStudentListWorkbook,
  buildSummaryWorkbook,
} from '@/lib/reportExcel';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TYPES = ['report', 'printed', 'unprinted', 'cards', 'incomplete'] as const;
type ExportType = (typeof TYPES)[number];

export async function GET(req: NextRequest) {
  try {
    const user = isAuthenticated(req);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const sp = req.nextUrl.searchParams;
    const type = (sp.get('type') || 'report') as ExportType;
    if (!TYPES.includes(type)) {
      return NextResponse.json({ success: false, message: 'Invalid report type' }, { status: 400 });
    }

    await connectDB();

    const printedOverride: PrintFilter =
      type === 'printed' ? 'printed' : type === 'unprinted' ? 'unprinted' : '';
    // Only these report types look at the printed state; the others use every student.
    const match = buildStudentFilter(
      sp,
      type === 'printed' || type === 'unprinted' ? printedOverride : '',
    );

    let buffer: Buffer;
    let label: string;
    let rowCount = 0;

    if (type === 'report') {
      const summary = await loadSummary(match);
      buffer = buildSummaryWorkbook(summary, describeFilters(sp));
      label = 'summary_report';
      rowCount = summary.totals.total;
    } else {
      const rows = await loadStudentRows(match);
      const batchNames = await loadBatchNames(rows);
      rowCount = rows.length;

      if (type === 'printed') {
        buffer = buildStudentListWorkbook('Printed ID Cards', rows, batchNames);
        label = 'printed_id_cards';
      } else if (type === 'unprinted') {
        buffer = buildStudentListWorkbook('Unprinted ID Cards', rows, batchNames);
        label = 'unprinted_id_cards';
      } else if (type === 'cards') {
        buffer = buildCardStatusWorkbook(rows, batchNames);
        label = 'id_card_print_status';
      } else {
        buffer = buildIncompleteWorkbook(rows, batchNames);
        label = 'incomplete_records';
        rowCount = rows.filter(
          (s) => !s.hasPassport || ['N/A', ''].includes(s.bloodGroup) || ['N/A', ''].includes(s.genotype),
        ).length;
      }
    }

    const stamp = new Date().toISOString().slice(0, 10);
    const fileName = `FUNATO_${label}_${stamp}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'X-Row-Count': String(rowCount),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Report export error:', error);
    return NextResponse.json({ success: false, message: 'Failed to generate report' }, { status: 500 });
  }
}
