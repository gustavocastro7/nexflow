import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getSequelize } from '@/lib/config/database';

const PAGE_SIZE = 50;

function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) throw new Error('Token not provided');
  const [, token] = authHeader.split(' ');
  return jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key') as { id: string; email: string; profile: string };
}

export async function GET(request: NextRequest) {
  try {
    getAuthUser(request);
    const { searchParams } = request.nextUrl;
    const workspaceId = searchParams.get('workspaceId');
    const dueDate = searchParams.get('dueDate');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '0');

    if (!workspaceId) return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });

    const sequelize = getSequelize();
    const offset = page * PAGE_SIZE;
    const like = search ? `%${search}%` : null;

    const whereSql = `WHERE i.workspace_id = :workspaceId ${dueDate ? "AND ri.due_date = :dueDate" : ""} ${like ? "AND (cc.code LIKE :like OR cc.name LIKE :like OR pl.responsible_name LIKE :like OR i.source_phone LIKE :like)" : ""}`;
    const baseSql = `FROM invoices i JOIN raw_invoices ri ON ri.id = i.raw_invoice_id LEFT JOIN phone_lines pl ON pl.phone_number = i.source_phone AND pl.workspace_id = i.workspace_id LEFT JOIN cost_centers cc ON cc.id = pl.cost_center_id ${whereSql} GROUP BY cc.id, cc.code, cc.name, ri.due_date`;

    const [rows] = await sequelize.query(`
      SELECT cc.id AS cc_id, cc.code AS cc_code, COALESCE(cc.name, 'Unallocated') AS cc_name, ri.due_date AS due_date, SUM(i.charged_value) AS total
      ${baseSql} ORDER BY due_date DESC, ISNULL(cc_code), cc_code ASC LIMIT :limit OFFSET :offset
    `, { replacements: { workspaceId, dueDate, like, limit: PAGE_SIZE, offset } });

    const [[{ count }]] = await sequelize.query(`SELECT COUNT(*) AS count FROM (SELECT 1 ${baseSql}) t`, { replacements: { workspaceId, dueDate, like } });

    const items = (rows as any[]).map(r => ({
      costCenterCode: r.cc_code || '', costCenterName: r.cc_name, dueDate: r.due_date, total: parseFloat(r.total || 0),
    }));

    return NextResponse.json({ items, total: count, hasMore: offset + rows.length < count });
  } catch (error: any) {
    if (error.message === 'Token not provided' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error generating consumption by cost center report' }, { status: 500 });
  }
}
