import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/config/database';
import { verifyToken } from '@/lib/utils/jwt';
import UserSecurity from '@/lib/models/UserSecurity';

function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) throw new Error('Token not provided');
  const [, token] = authHeader.split(' ');
  return verifyToken(token) as { id: string; email: string; profile: string };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    await connectDB();
    getAuthUser(request);
    const { userId } = await params;
    let security: any = await UserSecurity.findOne({ user_id: userId });
    if (!security) security = await UserSecurity.create({ user_id: userId });
    return NextResponse.json(security);
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error fetching security configurations' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    await connectDB();
    getAuthUser(request);
    const { userId } = await params;
    const { two_factor_enabled, is_locked } = await request.json();

    let security: any = await UserSecurity.findOne({ user_id: userId });
    if (!security) {
      security = await UserSecurity.create({ user_id: userId, two_factor_enabled, is_locked });
    } else {
      Object.assign(security, { two_factor_enabled, is_locked });
      await security.save();
    }

    return NextResponse.json(security);
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error updating security configurations' }, { status: 500 });
  }
}
