// app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Admin from '@/models/Admin';

export async function GET(req: NextRequest) {
  try {
    const user = isAuthenticated(req);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const admin = await Admin.findById(user.adminId);

    if (!admin) {
      return NextResponse.json({ success: false, message: 'Admin not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        lastLogin: admin.lastLogin,
      },
    });
  } catch (error) {
    console.error('Me error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
