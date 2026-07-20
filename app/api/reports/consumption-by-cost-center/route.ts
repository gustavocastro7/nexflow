import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/config/database';
import { verifyToken } from '@/lib/utils/jwt';
import { escapeRegex } from '@/lib/utils/db';
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
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '0');

    if (!workspaceId) return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });

    const offset = page * PAGE_SIZE;

    const pipeline: any[] = [
      { $match: { workspace_id: workspaceId } },
      { $lookup: { from: 'rawinvoices', localField: 'raw_invoice_id', foreignField: '_id', as: 'raw' } },
      { $unwind: '$raw' },
    ];
    if (dueDate) pipeline.push({ $match: { 'raw.due_date': dueDate } });
    pipeline.push(
      { $lookup: {
          from: 'phonelines',
          let: { phone: '$source_phone', ws: '$workspace_id' },
          pipeline: [{ $match: { $expr: { $and: [{ $eq: ['$phone_number', '$$phone'] }, { $eq: ['$workspace_id', '$$ws'] }] } } }],
          as: 'pl'
        } },
      { $unwind: { path: '$pl', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'costcenters', localField: 'pl.cost_center_id', foreignField: '_id', as: 'cc' } },
      { $unwind: { path: '$cc', preserveNullAndEmptyArrays: true } },
    );
    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      pipeline.push({ $match: { $or: [
        { 'cc.code': regex }, { 'cc.name': regex }, { 'pl.responsible_name': regex }, { source_phone: regex },
      ] } });
    }
    pipeline.push(
      { $group: { _id: { cc_code: '$cc.code', cc_name: '$cc.name', due_date: '$raw.due_date' }, total: { $sum: '$charged_value' } } },
      { $addFields: { hasCode: { $cond: [{ $eq: ['$_id.cc_code', null] }, 1, 0] } } },
      { $sort: { '_id.due_date': -1, hasCode: 1, '_id.cc_code': 1 } },
      { $facet: {
          data: [{ $skip: offset }, { $limit: PAGE_SIZE }],
          totalCount: [{ $count: 'count' }],
        } },
    );

    const [result] = await Invoice.aggregate(pipeline);
    const rows = result?.data || [];
    const count = result?.totalCount?.[0]?.count || 0;

    const items = rows.map((r: any) => ({
      costCenterCode: r._id.cc_code || '',
      costCenterName: r._id.cc_name || 'Unallocated',
      dueDate: r._id.due_date,
      total: r.total || 0,
    }));

    return NextResponse.json({ items, total: count, hasMore: offset + rows.length < count });
  } catch (error: any) {
    if (error.message === 'Token not provided' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error generating consumption by cost center report' }, { status: 500 });
  }
}
