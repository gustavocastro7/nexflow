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

    const whereSql = `WHERE i.workspace_id = :workspaceId ${dueDate ? "AND ri.due_date = :dueDate" : ""} AND (i.section LIKE '%INTERNET (MB)%' OR i.sub_section LIKE '%INTERNET (MB)%' OR i.description LIKE '%INTERNET (MB)%') ${like ? "AND (i.source_phone LIKE :like OR coll.name LIKE :like OR pl.responsible_name LIKE :like OR cc.code LIKE :like OR cc.name LIKE :like)" : ""}`;
    const fromSql = `FROM invoices i JOIN raw_invoices ri ON ri.id = i.raw_invoice_id LEFT JOIN phone_lines pl ON pl.phone_number = i.source_phone AND pl.workspace_id = i.workspace_id LEFT JOIN collaborators coll ON coll.id = pl.collaborator_id LEFT JOIN cost_centers cc ON cc.id = pl.cost_center_id ${whereSql} GROUP BY i.source_phone, coll.name, pl.responsible_name, i.original_user, cc.code, cc.name`;

    const [rows] = await sequelize.query(`
      SELECT i.source_phone AS phone_number, COALESCE(coll.name, pl.responsible_name, i.original_user, '') AS responsible_name,
        cc.code AS cc_code, COALESCE(cc.name, 'Unallocated') AS cc_name,
        SUM(CAST(REGEXP_REPLACE(i.quantity, '[^0-9.]', '') AS DECIMAL(10,2))) / 1024 AS total_data_gb
      ${fromSql} ORDER BY total_data_gb DESC LIMIT :limit OFFSET :offset
    `, { replacements: { workspaceId, dueDate, like, limit: PAGE_SIZE, offset } });

    const [[{ count, grand_total_gb }]] = await sequelize.query(`
      SELECT COUNT(*) AS count, COALESCE(SUM(t.total_gb), 0) AS grand_total_gb
      FROM (SELECT SUM(CAST(REGEXP_REPLACE(i.quantity, '[^0-9.]', '') AS DECIMAL(10,2))) / 1024 AS total_gb ${fromSql}) t
    `, { replacements: { workspaceId, dueDate, like } });

    return NextResponse.json({
      items: (rows as any[]).map(r => ({ responsibleName: r.responsible_name || '', phoneNumber: r.phone_number || '', totalDataGb: parseFloat(r.total_data_gb || 0), costCenterCode: r.cc_code || '', costCenterName: r.cc_name || 'Unallocated' })),
      total: count, grandTotalGb: parseFloat(grand_total_gb || 0), hasMore: offset + rows.length < count,
    });
  } catch (error: any) {
    if (error.message === 'Token not provided' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error generating data consumption report' }, { status: 500 });
  }
}
