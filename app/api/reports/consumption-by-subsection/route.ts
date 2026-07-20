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
    if (!dueDate) return NextResponse.json({ error: 'Due date is required' }, { status: 400 });

    const offset = page * PAGE_SIZE;

    const pipeline: any[] = [
      { $match: { workspace_id: workspaceId } },
      { $lookup: { from: 'rawinvoices', localField: 'raw_invoice_id', foreignField: '_id', as: 'raw' } },
      { $unwind: '$raw' },
      { $match: { 'raw.due_date': dueDate } },
      { $lookup: {
          from: 'phonelines',
          let: { phone: '$source_phone', ws: '$workspace_id' },
          pipeline: [{ $match: { $expr: { $and: [{ $eq: ['$phone_number', '$$phone'] }, { $eq: ['$workspace_id', '$$ws'] }] } } }],
          as: 'pl'
        } },
      { $unwind: { path: '$pl', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'collaborators', localField: 'pl.collaborator_id', foreignField: '_id', as: 'coll' } },
      { $unwind: { path: '$coll', preserveNullAndEmptyArrays: true } },
    ];

    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      pipeline.push({ $match: { $or: [
        { source_phone: regex }, { 'coll.name': regex }, { 'pl.responsible_name': regex },
        { sub_section: regex }, { section: regex },
      ] } });
    }

    pipeline.push(
      { $addFields: {
          resolvedResponsibleName: { $ifNull: ['$coll.name', { $ifNull: ['$pl.responsible_name', ''] }] },
          resolvedSection: { $ifNull: ['$section', ''] },
          resolvedSubSection: { $ifNull: ['$sub_section', ''] },
        } },
      { $group: {
          _id: { phone: '$source_phone', responsible_name: '$resolvedResponsibleName', section: '$resolvedSection', sub_section: '$resolvedSubSection' },
          total: { $sum: '$charged_value' },
        } },
      { $sort: { '_id.phone': 1, '_id.sub_section': 1 } },
      { $facet: {
          data: [{ $skip: offset }, { $limit: PAGE_SIZE }],
          totalCount: [{ $count: 'count' }],
          grandTotal: [{ $group: { _id: null, total: { $sum: '$total' } } }],
        } },
    );

    const [result] = await Invoice.aggregate(pipeline);
    const rows = result?.data || [];
    const count = result?.totalCount?.[0]?.count || 0;
    const grandTotal = result?.grandTotal?.[0]?.total || 0;

    return NextResponse.json({
      items: rows.map((r: any) => ({
        phoneNumber: r._id.phone, responsibleName: r._id.responsible_name,
        section: r._id.section, subSection: r._id.sub_section, total: r.total || 0,
      })),
      total: count, grandTotal, hasMore: offset + rows.length < count,
    });
  } catch (error: any) {
    if (error.message === 'Token not provided' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error generating consumption by sub-section report' }, { status: 500 });
  }
}
