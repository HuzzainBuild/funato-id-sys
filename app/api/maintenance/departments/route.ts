import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';
import { canonicalizeDepartment, resolveStudentCollege } from '@/lib/cardTemplates';
import Student from '@/models/Student';

export async function POST(req: NextRequest) {
  try {
    const user = isAuthenticated(req);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const students = await Student.find()
      .select('_id department college')
      .lean();

    let checked = 0;
    let updated = 0;

    for (const student of students) {
      checked++;
      const department = canonicalizeDepartment(student.department);
      const college = resolveStudentCollege(student.college, department);

      if (department !== student.department || college !== student.college) {
        await Student.updateOne(
          { _id: student._id },
          { $set: { department, college } },
        );
        updated++;
      }
    }

    return NextResponse.json({
      success: true,
      checked,
      updated,
    });
  } catch (error) {
    console.error('Department maintenance error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
