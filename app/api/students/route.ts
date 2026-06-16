// app/api/students/route.ts
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import type { SortOrder } from 'mongoose';
import { connectDB } from '@/lib/db';
import Student from '@/models/Student';
import { isAuthenticated } from '@/lib/auth';
import { formatMatricNumber } from '@/lib/utils';
import {
  COLLEGE_TEMPLATES,
  canonicalizeDepartment,
  getDepartmentSearchValues,
  resolveCollegeTemplate,
  resolveStudentCollege,
} from '@/lib/cardTemplates';

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
    const college = searchParams.get('college') || '';
    const department = searchParams.get('department') || '';
    const year = searchParams.get('year') || '';
    const sex = searchParams.get('sex') || '';
    const uploadId = searchParams.get('uploadId') || '';
    const printed = searchParams.get('printed') || '';
    const sort = searchParams.get('sort') || '';

    // Build query
    const query: Record<string, unknown> = {};

    if (search) {
      const matricSearch = formatMatricNumber(search);
      query.$or = [
        { surname: { $regex: search, $options: 'i' } },
        { otherNames: { $regex: search, $options: 'i' } },
        { matricNumber: { $regex: search, $options: 'i' } },
        ...(matricSearch !== search
          ? [{ matricNumber: { $regex: matricSearch, $options: 'i' } }]
          : []),
      ];
    }

    if (department) {
      query.department = {
        $in: getDepartmentSearchValues(department).map((value) => new RegExp(`^${escapeRegex(value)}$`, 'i')),
      };
    }
    if (college) {
      const collegeTemplate = resolveCollegeTemplate(college);
      const knownCollege = Object.values(COLLEGE_TEMPLATES).some(
        (template) => template.key === collegeTemplate.key && template.college === collegeTemplate.college,
      );
      const departmentValues = knownCollege
        ? Array.from(
            new Set(
              collegeTemplate.departments.flatMap((value) =>
                getDepartmentSearchValues(value),
              ),
            ),
          )
        : [];

      addAndCondition(query, {
        $or: [
          { college: new RegExp(`^${escapeRegex(college)}$`, 'i') },
          ...(departmentValues.length
            ? [
                {
                  department: {
                    $in: departmentValues.map(
                      (value) => new RegExp(`^${escapeRegex(value)}$`, 'i'),
                    ),
                  },
                },
              ]
            : []),
        ],
      });
    }
    if (year) query.importYear = parseInt(year);
    if (sex) query.sex = sex;
    if (uploadId && mongoose.Types.ObjectId.isValid(uploadId)) {
      query.uploadRecordId = new mongoose.Types.ObjectId(uploadId);
    }
    if (printed === 'unprinted') {
      const unprintedCondition = {
        $or: [{ printedAt: { $exists: false } }, { printedAt: null }],
      };
      addAndCondition(query, unprintedCondition);
    } else if (printed === 'printed') {
      query.printedAt = { $exists: true, $ne: null };
    }

    const skip = (page - 1) * limit;
    const sortBy: Record<string, SortOrder> =
      sort === 'college'
        ? {
            college: 1,
            department: 1,
            surname: 1,
            otherNames: 1,
            matricNumber: 1,
          }
        : { createdAt: -1 };

    const [students, total] = await Promise.all([
      Student.find(query)
        .sort(sortBy)
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
    if (body.matricNumber) {
      body.matricNumber = formatMatricNumber(body.matricNumber);
    }
    if (body.department) {
      body.department = canonicalizeDepartment(body.department);
      body.college = resolveStudentCollege(body.college, body.department);
    }

    // Check for duplicate matric number
    const existing = await Student.findOne({ matricNumber: body.matricNumber });
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

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function addAndCondition(
  query: Record<string, unknown>,
  condition: Record<string, unknown>,
) {
  if (Array.isArray(query.$and)) {
    query.$and.push(condition);
    return;
  }

  if (Array.isArray(query.$or)) {
    query.$and = [{ $or: query.$or }, condition];
    delete query.$or;
    return;
  }

  query.$and = [condition];
}
