// lib/auth.ts
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'funato-default-secret-change-in-prod';
const TOKEN_EXPIRY = '24h';

export interface JWTPayload {
  adminId: string;
  email: string;
  name: string;
  role: string;
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export async function getAuthUser(req?: NextRequest): Promise<JWTPayload | null> {
  try {
    let token: string | undefined;

    if (req) {
      // From request headers
      const authHeader = req.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
      // From cookies
      if (!token) {
        token = req.cookies.get('auth-token')?.value;
      }
    } else {
      // From Next.js cookies (server components)
      const cookieStore = await cookies();
      token = cookieStore.get('auth-token')?.value;
    }

    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}

export function isAuthenticated(req: NextRequest): JWTPayload | null {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.substring(7)
    : req.cookies.get('auth-token')?.value;

  if (!token) return null;
  return verifyToken(token);
}
