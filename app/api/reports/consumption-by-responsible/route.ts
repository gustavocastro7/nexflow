import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getSequelize } from '@/lib/config/database';
import { logOperation } from '@/lib/utils/auditLogger';

const PAGE_SIZE = 50;

function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) throw new Error('Token not provided');
  const [, token] = authHeader.split(' ');
  return jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key') as { id: string; email: string; profile: string };
}

export async function GET(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);
    const { searchParams } = request.nextUrl;
    const workspaceId = searchParams.get('workspaceId');
    const dueDate = searchParams.get('dueDate');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '0');

    if (!workspaceId) return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });
    if (!dueDate) return NextResponse.json({ error: 'Due date is required' }, { status: 400 });

    if (page === 0) {
      await logOperation({
        user_id: decoded.id, workspace_id: workspaceId, action: 'REPORT', entity: 'ConsumptionByResponsible',
        ip_address: request.headers.get('x-forwarded-for') || 'unknown', payload: { dueDate, search }
      });
    }

    const sequelize = getSequelize();
    const offset = page * PAGE_SIZE;
    const like = search ? `%${search}%` : null;

    const whereSql = `WHERE i.workspace_id = :workspaceId AND ri.due_date = :dueDate ${like ? "AND (cc.code LIKE :like OR cc.name LIKE :like OR coll.name LIKE :like OR pl.responsible_name LIKE :like OR i.source_phone LIKE :like OR i.original_user LIKE :like)" : ""}`;
    const fromSql = `FROM invoices i JOIN raw_invoices ri ON ri.id = i.raw_invoice_id LEFT JOIN phone_lines pl ON pl.phone_number = i.source_phone AND pl.workspace_id = i.workspace_id LEFT JOIN collaborators coll ON coll.id = pl.collaborator_id LEFT JOIN cost_centers cc ON cc.id = pl.cost_center_id ${whereSql} GROUP BY i.source_phone, coll.name, pl.responsible_name, i.original_user, coll.external_id, pl.responsible_id, cc.code, cc.name`;

    const [rows] = await sequelize.query(`
      SELECT i.source_phone AS phone_number, COALESCE(coll.name, pl.responsible_name, i.original_user, '') AS responsible_name,
        COALESCE(coll.external_id, pl.responsible_id) AS responsible_id, cc.code AS cc_code, COALESCE(cc.name, 'Unallocated') AS cc_name, SUM(i.charged_value) AS total
      ${fromSql} ORDER BY responsible_name ASC, i.source_phone ASC LIMIT :limit OFFSET :offset
    `, { replacements: { workspaceId, dueDate, like, limit: PAGE_SIZE, offset } });

    const [[{ count, grand_total }]] = await sequelize.query(`SELECT COUNT(*) AS count, COALESCE(SUM(t.total), 0) AS grand_total FROM (SELECT SUM(i.charged_value) AS total ${fromSql}) t`, { replacements: { workspaceId, dueDate, like } });

    const items = (rows as any[]).map(r => ({
      responsibleName: r.responsible_name || '', responsibleId: r.responsible_id || '',
      phoneNumber: r.phone_number, costCenterCode: r.cc_code || '', costCenterName: r.cc_name, total: parseFloat(r.total || 0),
    }));

    return NextResponse.json({ items, total: count, grandTotal: parseFloat(grand_total || 0), hasMore: offset + rows.length < count });
  } catch (error: any) {
    if (error.message === 'Token not provided' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error generating consumption by responsible report' }, { status: 500 });
  }
}
