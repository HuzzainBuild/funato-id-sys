// app/api/reports/summary/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';
import { buildStudentFilter } from '@/lib/reportQuery';
import { loadSummary } from '@/lib/reportData';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = isAuthenticated(req);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const match = buildStudentFilter(req.nextUrl.searchParams);
    const summary = await loadSummary(match);

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error('Report summary error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
