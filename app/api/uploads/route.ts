import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';
import Student from '@/models/Student';
import UploadRecord from '@/models/UploadRecord';

export async function GET(req: NextRequest) {
  try {
    const user = isAuthenticated(req);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const uploads = await UploadRecord.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const uploadIds = uploads.map((upload) => upload._id);
    const counts = await Student.aggregate([
      { $match: { uploadRecordId: { $in: uploadIds } } },
      {
        $group: {
          _id: '$uploadRecordId',
          studentCount: { $sum: 1 },
          printedCount: {
            $sum: {
              $cond: [{ $ifNull: ['$printedAt', false] }, 1, 0],
            },
          },
        },
      },
    ]);

    const countsByUpload = new Map(
      counts.map((count) => [
        String(count._id),
        {
          studentCount: count.studentCount as number,
          printedCount: count.printedCount as number,
        },
      ]),
    );
    return NextResponse.json({
      success: true,
      uploads: uploads.map((upload) => {
        const count = countsByUpload.get(String(upload._id)) || {
          studentCount: 0,
          printedCount: 0,
        };

        return {
          ...upload,
          studentCount: count.studentCount,
          printedCount: count.printedCount,
          unprintedCount: count.studentCount - count.printedCount,
        };
      }),
    });
  } catch (error) {
    console.error('Get uploads error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = isAuthenticated(req);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { uploadId, action } = await req.json();
    if (!uploadId || !mongoose.Types.ObjectId.isValid(uploadId)) {
      return NextResponse.json({ success: false, message: 'Valid upload ID is required' }, { status: 400 });
    }

    await connectDB();

    if (action === 'markPrinted') {
      const result = await Student.updateMany(
        { uploadRecordId: new mongoose.Types.ObjectId(uploadId) },
        {
          $set: { printedAt: new Date() },
          $inc: { printCount: 1 },
        },
      );

      return NextResponse.json({ success: true, updated: result.modifiedCount });
    }

    if (action === 'markUnprinted') {
      const result = await Student.updateMany(
        { uploadRecordId: new mongoose.Types.ObjectId(uploadId) },
        {
          $unset: { printedAt: '' },
          $set: { printCount: 0 },
        },
      );

      return NextResponse.json({ success: true, updated: result.modifiedCount });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Update upload print status error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = isAuthenticated(req);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { uploadId } = await req.json();
    if (!uploadId || !mongoose.Types.ObjectId.isValid(uploadId)) {
      return NextResponse.json({ success: false, message: 'Valid upload ID is required' }, { status: 400 });
    }

    await connectDB();

    const objectId = new mongoose.Types.ObjectId(uploadId);
    const studentsResult = await Student.deleteMany({ uploadRecordId: objectId });
    const uploadResult = await UploadRecord.deleteOne({ _id: objectId });

    return NextResponse.json({
      success: true,
      deletedStudents: studentsResult.deletedCount,
      deletedUploads: uploadResult.deletedCount,
    });
  } catch (error) {
    console.error('Delete upload batch error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
