import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getSequelize } from '@/lib/config/database';

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

    const [rows] = await sequelize.query(`
      SELECT DISTINCT due_date FROM raw_invoices WHERE workspace_id = :workspaceId AND due_date IS NOT NULL ORDER BY due_date DESC
    `, { replacements: { workspaceId } });

    const [[{ hasNull }]] = await sequelize.query(`
      SELECT COUNT(*) > 0 AS "hasNull" FROM raw_invoices WHERE workspace_id = :workspaceId AND due_date IS NULL
    `, { replacements: { workspaceId } });

    const dates = (rows as any[]).map(r => r.due_date);
    if ((hasNull as any)) dates.push('NO_DATE');
    return NextResponse.json(dates);
  } catch (error: any) {
    if (error.message === 'Token not provided' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error fetching due dates' }, { status: 500 });
  }
}
