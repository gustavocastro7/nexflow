import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getSequelize } from '@/lib/config/database';
import Workspace from '@/lib/models/Workspace';

function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) throw new Error('Token not provided');
  const [, token] = authHeader.split(' ');
  return jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key') as { id: string; email: string; profile: string };
}

export async function GET(request: NextRequest) {
  try {
    getAuthUser(request);
    const workspaceId = request.nextUrl.searchParams.get('workspaceId');
    if (!workspaceId) return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });

    const sequelize = getSequelize();
    const workspace: any = await Workspace.findByPk(workspaceId);
    const startDay = workspace?.billing_cycle_start_day || 1;
    const intervalDays = startDay - 1;
    const dateExpr = intervalDays > 0 ? `DATE_SUB(item_date, INTERVAL ${intervalDays} DAY)` : 'item_date';

    const [rows] = await sequelize.query(`
      SELECT DISTINCT DATE_FORMAT(${dateExpr}, '%Y-%m') AS month
      FROM invoices WHERE workspace_id = :workspaceId AND item_date IS NOT NULL ORDER BY month DESC
    `, { replacements: { workspaceId } });

    return NextResponse.json((rows as any[]).map(r => r.month));
  } catch (error: any) {
    if (error.message === 'Token not provided' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error fetching reference months' }, { status: 500 });
  }
}
