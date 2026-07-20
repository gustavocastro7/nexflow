import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/config/database';
import { verifyToken } from '@/lib/utils/jwt';
import Workspace from '@/lib/models/Workspace';
import Invoice from '@/lib/models/Invoice';

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

    const workspace: any = await Workspace.findById(workspaceId);
    const startDay = workspace?.billing_cycle_start_day || 1;
    const intervalDays = startDay - 1;

    const itemDates: string[] = await Invoice.distinct('item_date', { workspace_id: workspaceId, item_date: { $ne: null } });

    const monthsSet = new Set<string>();
    for (const d of itemDates) {
      const date = new Date(`${d}T00:00:00Z`);
      if (intervalDays > 0) date.setUTCDate(date.getUTCDate() - intervalDays);
      const month = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
      monthsSet.add(month);
    }

    const months = Array.from(monthsSet).sort().reverse();
    return NextResponse.json(months);
  } catch (error: any) {
    if (error.message === 'Token not provided' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error fetching reference months' }, { status: 500 });
  }
}
