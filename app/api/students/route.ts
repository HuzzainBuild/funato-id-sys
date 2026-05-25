// app/api/students/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Student from '@/models/Student';
import { isAuthenticated } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = isAuthenticated(req);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const department = searchParams.get('department') || '';
    const year = searchParams.get('year') || '';
    const sex = searchParams.get('sex') || '';

    // Build query
    const query: Record<string, unknown> = {};

    if (search) {
      query.$or = [
        { surname: { $regex: search, $options: 'i' } },
        { otherNames: { $regex: search, $options: 'i' } },
        { matricNumber: { $regex: search, $options: 'i' } },
      ];
    }

    if (department) query.department = { $regex: department, $options: 'i' };
    if (year) query.importYear = parseInt(year);
    if (sex) query.sex = sex;

    const skip = (page - 1) * limit;

    const [students, total] = await Promise.all([
      Student.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Student.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      students,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get students error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = isAuthenticated(req);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await req.json();
    delete body.passportData;

    // Check for duplicate matric number
    const existing = await Student.findOne({ matricNumber: body.matricNumber?.toUpperCase() });
    if (existing) {
      return NextResponse.json(
        { success: false, message: `Student with matric number ${body.matricNumber} already exists` },
        { status: 409 }
      );
    }

    const student = await Student.create(body);

    return NextResponse.json({
      success: true,
      message: 'Student created successfully',
      student,
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('Create student error:', error);
    if ((error as { code?: number }).code === 11000) {
      return NextResponse.json(
        { success: false, message: 'Matric number already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
