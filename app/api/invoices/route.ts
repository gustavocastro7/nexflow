import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import Invoice from '@/lib/models/Invoice';
import RawInvoice from '@/lib/models/RawInvoice';

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
    const operator = searchParams.get('operator');
    const dueDate = searchParams.get('dueDate');
    const page = searchParams.get('page');
    const limit = searchParams.get('limit');
    const raw_invoice_id = searchParams.get('raw_invoice_id');

    if (!workspaceId) return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });

    const where: Record<string, any> = { workspace_id: workspaceId };
    if (operator) where.operator = operator;
    if (raw_invoice_id) where.raw_invoice_id = raw_invoice_id;

    const include: any[] = [];
    if (dueDate === 'NO_DATE') {
      include.push({ model: RawInvoice, as: 'header', attributes: [], where: { due_date: { [Op.is]: null } }, required: true });
    } else if (dueDate) {
      include.push({ model: RawInvoice, as: 'header', attributes: [], where: { due_date: dueDate }, required: true });
    }

    const order = [['item_date', 'DESC'], ['item_time', 'DESC'], ['id', 'ASC']];

    if (page !== null || limit !== null) {
      const pageNum = Math.max(1, parseInt(page || '1', 10));
      const pageSize = Math.min(200, Math.max(1, parseInt(limit || '50', 10)));
      const offset = (pageNum - 1) * pageSize;

      const { rows, count }: { rows: any[]; count: number } = await (Invoice as any).findAndCountAll({
        where, include, order, limit: pageSize, offset
      });

      return NextResponse.json({ data: rows, page: pageNum, limit: pageSize, total: count, hasMore: offset + rows.length < count });
    }

    const invoices: any = await Invoice.findAll({ where, include, order });
    return NextResponse.json(invoices);
  } catch (error: any) {
    if (error.message === 'Token not provided' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error listing invoices' }, { status: 500 });
  }
}
