import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/config/database';
import { verifyToken } from '@/lib/utils/jwt';
import RawInvoice from '@/lib/models/RawInvoice';

function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) throw new Error('Token not provided');
  const [, token] = authHeader.split(' ');
  return verifyToken(token) as { id: string; email: string; profile: string };
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    getAuthUser(request);
    const workspaceId = request.nextUrl.searchParams.get('workspaceId');
    if (!workspaceId) return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });

    const dates: string[] = await RawInvoice.distinct('due_date', { workspace_id: workspaceId, due_date: { $ne: null } });
    dates.sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));

    const hasNull = await RawInvoice.exists({ workspace_id: workspaceId, due_date: null });
    if (hasNull) dates.push('NO_DATE');

    return NextResponse.json(dates);
  } catch (error: any) {
    if (error.message === 'Token not provided' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error fetching due dates' }, { status: 500 });
  }
}
