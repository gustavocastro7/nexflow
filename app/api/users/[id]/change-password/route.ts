import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import User from '@/lib/models/User';

function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) throw new Error('Token not provided');
  const [, token] = authHeader.split(' ');
  return jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key') as { id: string; email: string; profile: string };
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const decoded = getAuthUser(request);
    const { id } = await params;

    if (decoded.id !== id) {
      return NextResponse.json({ error: 'Permission denied.' }, { status: 403 });
    }

    const { currentPassword, newPassword } = await request.json();
    const user: any = await User.findByPk(id);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const checkPassword = await user.checkPassword(currentPassword);
    if (!checkPassword) {
      return NextResponse.json({ error: 'Incorrect current password' }, { status: 401 });
    }

    user.password_hash = newPassword;
    await user.save();

    return NextResponse.json({ message: 'Password updated successfully' });
  } catch (error: any) {
    if (error.message === 'Token not provided' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error changing password' }, { status: 500 });
  }
}
