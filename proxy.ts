import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

const PUBLIC = ['/login', '/api/auth/login', '/api/auth/seed'];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some(p => pathname.startsWith(p))) return NextResponse.next();
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/api/')) {
    const token = req.cookies.get('auth-token')?.value
      || req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token || !verifyToken(token)) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ success:false, message:'Unauthorized' }, { status:401 });
      }
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ['/dashboard/:path*', '/api/:path*'] };
