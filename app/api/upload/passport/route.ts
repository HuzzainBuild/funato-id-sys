// app/api/upload/passport/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Student from '@/models/Student';
import { isAuthenticated } from '@/lib/auth';
import { uploadPassportToCloudinary } from '@/lib/cloudinary';

export async function POST(req: NextRequest) {
  try {
    const user = isAuthenticated(req);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const formData = await req.formData();
    const file = (formData.get('passport') || formData.get('file')) as File;
    const studentId = formData.get('studentId') as string;

    if (!file) {
      return NextResponse.json({ success: false, message: 'No file provided' }, { status: 400 });
    }

    if (!studentId) {
      return NextResponse.json({ success: false, message: 'Student ID is required' }, { status: 400 });
    }

    const existingStudent = await Student.findById(studentId).select('_id');
    if (!existingStudent) {
      return NextResponse.json({ success: false, message: 'Student not found' }, { status: 404 });
    }

    // Validate file type
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedImageTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: 'Invalid image type. Use JPEG, PNG, or WebP' },
        { status: 400 }
      );
    }

    // File size limit: 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, message: 'Image too large. Maximum size is 5MB' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const passportUrl = await uploadPassportToCloudinary({
      buffer,
      mimeType: file.type,
      fileName: file.name,
      studentId,
    });

    // Update student record
    const student = await Student.findByIdAndUpdate(
      studentId,
      { passportUrl, $unset: { passportData: '' } },
      { new: true }
    );

    if (!student) {
      return NextResponse.json({ success: false, message: 'Student not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Passport uploaded successfully',
      passportUrl,
      student: {
        _id: student._id,
        passportUrl: student.passportUrl,
      },
    });
  } catch (error) {
    console.error('Passport upload error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to upload passport' },
      { status: 500 }
    );
  }
}

// Bulk passport upload from base64 data
export async function PUT(req: NextRequest) {
  try {
    const user = isAuthenticated(req);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { studentId, passportData, mimeType } = await req.json();

    if (!studentId || !passportData) {
      return NextResponse.json(
        { success: false, message: 'Student ID and passport data are required' },
        { status: 400 }
      );
    }

    const existingStudent = await Student.findById(studentId).select('_id');
    if (!existingStudent) {
      return NextResponse.json({ success: false, message: 'Student not found' }, { status: 404 });
    }

    const dataUrl = passportData.startsWith('data:')
      ? passportData
      : `data:${mimeType || 'image/jpeg'};base64,${passportData}`;
    const match = dataUrl.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);

    if (!match) {
      return NextResponse.json(
        { success: false, message: 'Invalid passport data' },
        { status: 400 }
      );
    }

    const passportUrl = await uploadPassportToCloudinary({
      buffer: Buffer.from(match[2], 'base64'),
      mimeType: match[1],
      studentId,
    });

    const student = await Student.findByIdAndUpdate(
      studentId,
      { passportUrl, $unset: { passportData: '' } },
      { new: true }
    );

    if (!student) {
      return NextResponse.json({ success: false, message: 'Student not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Passport uploaded successfully',
      studentId,
      passportUrl,
    });
  } catch (error) {
    console.error('Passport data update error:', error);
    return NextResponse.json({ success: false, message: 'Failed to update passport' }, { status: 500 });
  }
}
