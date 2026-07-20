import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/config/database';
import { verifyToken } from '@/lib/utils/jwt';
import UserWorkspace from '@/lib/models/UserWorkspace';
import OperationLog from '@/lib/models/OperationLog';

function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) throw new Error('Token not provided');
  const [, token] = authHeader.split(' ');
  return verifyToken(token) as { id: string; email: string; profile: string };
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const decoded = getAuthUser(request);
    const userId = request.nextUrl.searchParams.get('userId') || decoded.id;
    const targetUserId = userId;

    if (decoded.profile !== 'jedi') {
      return NextResponse.json({ multiple: false, count: 1 });
    }

    const associations: any[] = await UserWorkspace.find({ user_id: targetUserId });
    if (associations.length > 1) {
      await OperationLog.create({
        user_id: targetUserId, workspace_id: 'SYSTEM',
        action: 'MULTIPLE_ASSOCIATIONS_DETECTED',
        payload: { count: associations.length, associations }
      });
      return NextResponse.json({ multiple: true, count: associations.length, message: 'User has multiple workspace associations' });
    }
    return NextResponse.json({ multiple: false, count: associations.length });
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error verifying associations' }, { status: 500 });
  }
}
