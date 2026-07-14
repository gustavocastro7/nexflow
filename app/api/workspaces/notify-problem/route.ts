import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import OperationLog from '@/lib/models/OperationLog';

function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) throw new Error('Token not provided');
  const [, token] = authHeader.split(' ');
  return jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key') as { id: string; email: string; profile: string };
}

export async function POST(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);
    const { userId, message } = await request.json();

    await OperationLog.create({
      user_id: userId || decoded.id, workspace_id: 'SYSTEM',
      action: 'WORKSPACE_ASSOCIATION_PROBLEM', payload: { message }
    });

    return NextResponse.json({ message: 'Problem notified successfully' });
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error notifying problem' }, { status: 500 });
  }
}
