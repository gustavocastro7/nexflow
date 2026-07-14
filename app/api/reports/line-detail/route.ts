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
    const phoneNumber = searchParams.get('phoneNumber');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '0');

    if (!workspaceId || !dueDate || !phoneNumber) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const sequelize = getSequelize();
    const offset = page * PAGE_SIZE;
    const like = search ? `%${search}%` : null;

    const whereSql = `WHERE i.workspace_id = :workspaceId AND ri.due_date = :dueDate AND i.source_phone = :phoneNumber ${like ? "AND (i.description LIKE :like OR i.destination_phone LIKE :like OR i.section LIKE :like OR i.sub_section LIKE :like)" : ""}`;

    const [rows] = await sequelize.query(`
      SELECT i.id, i.item_date, i.item_time, i.description, i.destination_phone, i.duration, i.quantity, i.total_value, i.charged_value, i.section, i.sub_section
      FROM invoices i JOIN raw_invoices ri ON ri.id = i.raw_invoice_id ${whereSql}
      ORDER BY i.item_date DESC, i.item_time DESC LIMIT :limit OFFSET :offset
    `, { replacements: { workspaceId, dueDate, phoneNumber, like, limit: PAGE_SIZE, offset } });

    const [[{ count, total_charged }]] = await sequelize.query(`
      SELECT COUNT(*) AS count, SUM(i.charged_value) as total_charged
      FROM invoices i JOIN raw_invoices ri ON ri.id = i.raw_invoice_id ${whereSql}
    `, { replacements: { workspaceId, dueDate, phoneNumber, like } });

    return NextResponse.json({ items: rows, total: count, grandTotal: parseFloat(total_charged || 0), hasMore: offset + rows.length < count });
  } catch (error: any) {
    if (error.message === 'Token not provided' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error generating line detail report' }, { status: 500 });
  }
}
