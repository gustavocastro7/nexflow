import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/config/database';
import { verifyToken } from '@/lib/utils/jwt';
import Invoice from '@/lib/models/Invoice';
import RawInvoice from '@/lib/models/RawInvoice';

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
    const { searchParams } = request.nextUrl;
    const workspaceId = searchParams.get('workspaceId');
    const operator = searchParams.get('operator');
    const dueDate = searchParams.get('dueDate');
    const page = searchParams.get('page');
    const limit = searchParams.get('limit');
    const raw_invoice_id = searchParams.get('raw_invoice_id');

    if (!workspaceId) return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });

    const filter: Record<string, any> = { workspace_id: workspaceId };
    if (operator) filter.operator = operator;

    if (raw_invoice_id) {
      filter.raw_invoice_id = raw_invoice_id;
    } else if (dueDate) {
      const dueDateFilter = dueDate === 'NO_DATE'
        ? { workspace_id: workspaceId, due_date: null }
        : { workspace_id: workspaceId, due_date: dueDate };
      const rawIds = (await RawInvoice.find(dueDateFilter).select('_id')).map((r: any) => r.id);
      filter.raw_invoice_id = { $in: rawIds };
    }

    const sort = { item_date: -1 as const, item_time: -1 as const, _id: 1 as const };

    if (page !== null || limit !== null) {
      const pageNum = Math.max(1, parseInt(page || '1', 10));
      const pageSize = Math.min(200, Math.max(1, parseInt(limit || '50', 10)));
      const offset = (pageNum - 1) * pageSize;

      const [rows, count] = await Promise.all([
        Invoice.find(filter).sort(sort).skip(offset).limit(pageSize),
        Invoice.countDocuments(filter),
      ]);

      return NextResponse.json({ data: rows, page: pageNum, limit: pageSize, total: count, hasMore: offset + rows.length < count });
    }

    const invoices: any = await Invoice.find(filter).sort(sort);
    return NextResponse.json(invoices);
  } catch (error: any) {
    if (error.message === 'Token not provided' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error listing invoices' }, { status: 500 });
  }
}
