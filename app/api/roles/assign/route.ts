import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import User from '@/lib/models/User';

function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) throw new Error('Token not provided');
  const [, token] = authHeader.split(' ');
  return jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key') as { id: string; email: string; profile: string };
}

export async function POST(request: NextRequest) {
  try {
    getAuthUser(request);
    const { userId, roleName } = await request.json();

    const user: any = await User.findByPk(userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    user.profile = roleName;
    await user.save();

    return NextResponse.json({ message: 'Role assigned successfully', user });
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error assigning role' }, { status: 500 });
  }
}
