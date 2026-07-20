import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/config/database';
import { verifyToken } from '@/lib/utils/jwt';
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
    if (decoded.profile !== 'jedi') {
      return NextResponse.json({ error: 'Access denied. Jedi profile required.' }, { status: 403 });
    }

    const entities: string[] = await OperationLog.distinct('entity');
    return NextResponse.json(entities.filter(Boolean));
  } catch (error: any) {
    if (error.message === 'Token not provided' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch entity types' }, { status: 500 });
  }
}
