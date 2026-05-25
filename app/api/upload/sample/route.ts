import { NextRequest, NextResponse } from 'next/server';
import { generateSampleExcel } from '@/lib/excel';
import { isAuthenticated } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = isAuthenticated(req);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const buffer = generateSampleExcel();
    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="FUNATO_Student_Import_Template.xlsx"',
      },
    });
  } catch (error) {
    console.error('Sample Excel error:', error);
    return NextResponse.json({ success: false, message: 'Failed to generate sample' }, { status: 500 });
  }
}
