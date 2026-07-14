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
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '0');

    if (!workspaceId) return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });

    const sequelize = getSequelize();
    const offset = page * PAGE_SIZE;
    const searchPattern = search ? `%${search}%` : null;

    const baseSql = `
      FROM (SELECT DISTINCT source_phone, workspace_id FROM invoices WHERE workspace_id = :workspaceId AND source_phone IS NOT NULL AND source_phone != ''
        UNION SELECT DISTINCT phone_number as source_phone, workspace_id FROM phone_lines WHERE workspace_id = :workspaceId) AS unique_phones
      LEFT JOIN phone_lines pl ON pl.phone_number = unique_phones.source_phone AND pl.workspace_id = unique_phones.workspace_id
      LEFT JOIN collaborators coll ON coll.id = pl.collaborator_id
      LEFT JOIN cost_centers cc ON cc.id = pl.cost_center_id
      WHERE 1=1 ${searchPattern ? `AND (unique_phones.source_phone LIKE :search OR coll.name LIKE :search OR pl.responsible_name LIKE :search OR cc.name LIKE :search OR cc.code LIKE :search)` : ''}
    `;

    const [rows] = await sequelize.query(`
      SELECT unique_phones.source_phone AS "phoneNumber", pl.id AS id,
        COALESCE(coll.name, pl.responsible_name, (SELECT original_user FROM invoices inv WHERE inv.source_phone = unique_phones.source_phone AND inv.workspace_id = unique_phones.workspace_id AND inv.original_user IS NOT NULL AND inv.original_user != '' LIMIT 1)) AS "responsibleName",
        COALESCE(coll.external_id, pl.responsible_id) AS "responsibleId", coll.id AS "collaboratorId",
        cc.code AS "costCenterCode", COALESCE(cc.name, 'Unallocated') AS "costCenterName"
      ${baseSql} ORDER BY ISNULL(cc.code), cc.code ASC, unique_phones.source_phone ASC LIMIT :limit OFFSET :offset
    `, { replacements: { workspaceId, search: searchPattern, limit: PAGE_SIZE, offset } });

    const [[{ count }]] = await sequelize.query(`SELECT COUNT(*) AS count ${baseSql}`, { replacements: { workspaceId, search: searchPattern } });

    const items = (rows as any[]).map(r => ({
      id: r.id || `temp-${r.phoneNumber}`, costCenterCode: r.costCenterCode || '', costCenterName: r.costCenterName,
      phoneNumber: r.phoneNumber, responsibleName: r.responsibleName || '', responsibleId: r.responsibleId || '',
    }));

    return NextResponse.json({ items, total: count, hasMore: offset + rows.length < count });
  } catch (error: any) {
    if (error.message === 'Token not provided' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error generating phone lines report' }, { status: 500 });
  }
}
