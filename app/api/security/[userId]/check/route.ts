import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import UserSecurity from '@/lib/models/UserSecurity';

function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) throw new Error('Token not provided');
  const [, token] = authHeader.split(' ');
  return jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key') as { id: string; email: string; profile: string };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    getAuthUser(request);
    const { userId } = await params;
    const security: any = await UserSecurity.findOne({ where: { user_id: userId } });
    return NextResponse.json({ configured: !!security });
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error checking security configurations' }, { status: 500 });
  }
}
