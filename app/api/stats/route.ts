// app/api/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Student from '@/models/Student';
import UploadRecord from '@/models/UploadRecord';
import { isAuthenticated } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = isAuthenticated(req);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const [
      totalStudents,
      totalUploads,
      recentUploads,
      departmentStats,
      yearStats,
      sexStats,
      recentStudents,
    ] = await Promise.all([
      Student.countDocuments(),
      UploadRecord.countDocuments(),
      UploadRecord.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
      Student.aggregate([
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { department: '$_id', count: 1, _id: 0 } },
      ]),
      Student.aggregate([
        { $group: { _id: '$importYear', count: { $sum: 1 } } },
        { $sort: { _id: -1 } },
        { $project: { year: '$_id', count: 1, _id: 0 } },
      ]),
      Student.aggregate([
        { $group: { _id: '$sex', count: { $sum: 1 } } },
        { $project: { sex: '$_id', count: 1, _id: 0 } },
      ]),
      Student.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('surname otherNames matricNumber department createdAt')
        .lean(),
    ]);

    const totalDepartments = departmentStats.length;

    return NextResponse.json({
      success: true,
      stats: {
        totalStudents,
        totalDepartments,
        totalUploads,
        recentUploads,
        studentsByDepartment: departmentStats,
        studentsByYear: yearStats,
        studentsBySex: sexStats,
        recentStudents,
      },
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
