import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import User from '@/lib/models/User';

function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) throw new Error('Token not provided');
  const [, token] = authHeader.split(' ');
  return jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key') as { id: string; email: string; profile: string };
}

export async function GET(request: NextRequest) {
  try {
    getAuthUser(request);
    const userId = request.nextUrl.searchParams.get('userId');
    const requiredRole = request.nextUrl.searchParams.get('requiredRole');

    const user: any = await User.findByPk(userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const hasRole = user.profile === requiredRole || user.profile === 'jedi';
    return NextResponse.json({ hasRole });
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error checking role' }, { status: 500 });
  }
}
