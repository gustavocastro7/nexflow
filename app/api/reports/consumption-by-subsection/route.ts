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
    if (!dueDate) return NextResponse.json({ error: 'Due date is required' }, { status: 400 });

    const sequelize = getSequelize();
    const offset = page * PAGE_SIZE;
    const like = search ? `%${search}%` : null;

    const whereSql = `WHERE i.workspace_id = :workspaceId AND ri.due_date = :dueDate ${like ? "AND (i.source_phone LIKE :like OR coll.name LIKE :like OR pl.responsible_name LIKE :like OR i.sub_section LIKE :like OR i.section LIKE :like)" : ""}`;
    const fromSql = `FROM invoices i JOIN raw_invoices ri ON ri.id = i.raw_invoice_id LEFT JOIN phone_lines pl ON pl.phone_number = i.source_phone AND pl.workspace_id = i.workspace_id LEFT JOIN collaborators coll ON coll.id = pl.collaborator_id ${whereSql} GROUP BY i.source_phone, coll.name, pl.responsible_name, i.section, i.sub_section`;

    const [rows] = await sequelize.query(`
      SELECT i.source_phone AS phone_number, COALESCE(coll.name, pl.responsible_name, '') AS responsible_name,
        COALESCE(i.section, '') AS section, COALESCE(i.sub_section, '') AS sub_section, SUM(i.charged_value) AS total
      ${fromSql} ORDER BY i.source_phone ASC, sub_section ASC LIMIT :limit OFFSET :offset
    `, { replacements: { workspaceId, dueDate, like, limit: PAGE_SIZE, offset } });

    const [[{ count, grand_total }]] = await sequelize.query(`SELECT COUNT(*) AS count, COALESCE(SUM(t.total), 0) AS grand_total FROM (SELECT SUM(i.charged_value) AS total ${fromSql}) t`, { replacements: { workspaceId, dueDate, like } });

    return NextResponse.json({
      items: (rows as any[]).map(r => ({ phoneNumber: r.phone_number, responsibleName: r.responsible_name, section: r.section, subSection: r.sub_section, total: parseFloat(r.total || 0) })),
      total: count, grandTotal: parseFloat(grand_total || 0), hasMore: offset + rows.length < count,
    });
  } catch (error: any) {
    if (error.message === 'Token not provided' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error generating consumption by sub-section report' }, { status: 500 });
  }
}
