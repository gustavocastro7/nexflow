import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/config/database';
import { verifyToken } from '@/lib/utils/jwt';
import RawInvoice from '@/lib/models/RawInvoice';
import Invoice from '@/lib/models/Invoice';

const PAGE_SIZE = 50;

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
    const dueDate = searchParams.get('dueDate');
    const phoneNumber = searchParams.get('phoneNumber');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '0');

    if (!workspaceId || !dueDate || !phoneNumber) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const offset = page * PAGE_SIZE;

    const rawIds = (await RawInvoice.find({ workspace_id: workspaceId, due_date: dueDate }).select('_id')).map((r: any) => r.id);

    const filter: Record<string, any> = {
      workspace_id: workspaceId,
      raw_invoice_id: { $in: rawIds },
      source_phone: phoneNumber,
    };
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { description: regex }, { destination_phone: regex }, { section: regex }, { sub_section: regex },
      ];
    }

    const [rows, count, sumResult] = await Promise.all([
      Invoice.find(filter)
        .select('item_date item_time description destination_phone duration quantity total_value charged_value section sub_section')
        .sort({ item_date: -1, item_time: -1 })
        .skip(offset).limit(PAGE_SIZE),
      Invoice.countDocuments(filter),
      Invoice.aggregate([{ $match: filter }, { $group: { _id: null, total: { $sum: '$charged_value' } } }]),
    ]);

    const grandTotal = sumResult[0]?.total || 0;

    return NextResponse.json({ items: rows, total: count, grandTotal, hasMore: offset + rows.length < count });
  } catch (error: any) {
    if (error.message === 'Token not provided' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error generating line detail report' }, { status: 500 });
  }
}
