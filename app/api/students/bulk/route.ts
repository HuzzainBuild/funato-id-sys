import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Student from '@/models/Student';
import { isAuthenticated } from '@/lib/auth';

export async function DELETE(req: NextRequest) {
  const user = isAuthenticated(req);
  if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const { ids } = await req.json();
  if (!Array.isArray(ids) || !ids.length)
    return NextResponse.json({ success: false, message: 'No IDs provided' }, { status: 400 });
  const result = await Student.deleteMany({ _id: { $in: ids } });
  return NextResponse.json({ success: true, deleted: result.deletedCount });
}

export async function PATCH(req: NextRequest) {
  const user = isAuthenticated(req);
  if (!user) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  const { ids, action } = await req.json();

  if (!Array.isArray(ids) || !ids.length) {
    return NextResponse.json({ success: false, message: 'No IDs provided' }, { status: 400 });
  }

  if (action === 'markPrinted') {
    const result = await Student.updateMany(
      { _id: { $in: ids } },
      {
        $set: { printedAt: new Date() },
        $inc: { printCount: 1 },
      },
    );

    return NextResponse.json({
      success: true,
      updated: result.modifiedCount,
    });
  }

  if (action === 'markUnprinted') {
    const result = await Student.updateMany(
      { _id: { $in: ids } },
      {
        $unset: { printedAt: '' },
        $set: { printCount: 0 },
      },
    );

    return NextResponse.json({
      success: true,
      updated: result.modifiedCount,
    });
  }

  return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
}
