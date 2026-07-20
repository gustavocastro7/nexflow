import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/config/database';
import { verifyToken } from '@/lib/utils/jwt';
import { escapeRegex } from '@/lib/utils/db';
import Invoice from '@/lib/models/Invoice';
import PhoneLine from '@/lib/models/PhoneLine';
import Collaborator from '@/lib/models/Collaborator';
import CostCenter from '@/lib/models/CostCenter';

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
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '0');

    if (!workspaceId) return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });

    const offset = page * PAGE_SIZE;

    const [invoicePhones, phoneLinePhones] = await Promise.all([
      Invoice.distinct('source_phone', { workspace_id: workspaceId, source_phone: { $nin: [null, ''] } }),
      PhoneLine.distinct('phone_number', { workspace_id: workspaceId }),
    ]);
    const uniquePhones = [...new Set([...invoicePhones, ...phoneLinePhones])];

    const phoneLines: any[] = await PhoneLine.find({ workspace_id: workspaceId, phone_number: { $in: uniquePhones } }).lean();
    const plByPhone = new Map(phoneLines.map((p) => [p.phone_number, p]));

    const collaboratorIds = [...new Set(phoneLines.map((p) => p.collaborator_id).filter(Boolean))];
    const costCenterIds = [...new Set(phoneLines.map((p) => p.cost_center_id).filter(Boolean))];
    const [collaborators, costCenters] = await Promise.all([
      Collaborator.find({ _id: { $in: collaboratorIds } }).select('name external_id').lean(),
      CostCenter.find({ _id: { $in: costCenterIds } }).select('name code').lean(),
    ]);
    const collabMap = new Map(collaborators.map((c: any) => [c._id, c]));
    const ccMap = new Map(costCenters.map((c: any) => [c._id, c]));

    const needsFallback = uniquePhones.filter((phone) => {
      const pl: any = plByPhone.get(phone);
      const coll: any = pl?.collaborator_id ? collabMap.get(pl.collaborator_id) : null;
      return !coll?.name && !pl?.responsible_name;
    });

    const fallbackMap = new Map<string, string>();
    if (needsFallback.length > 0) {
      const fallbackRows: any[] = await Invoice.find({
        workspace_id: workspaceId, source_phone: { $in: needsFallback }, original_user: { $nin: [null, ''] }
      }).select('source_phone original_user').lean();
      for (const row of fallbackRows) {
        if (!fallbackMap.has(row.source_phone)) fallbackMap.set(row.source_phone, row.original_user);
      }
    }

    let items = uniquePhones.map((phone) => {
      const pl: any = plByPhone.get(phone);
      const coll: any = pl?.collaborator_id ? collabMap.get(pl.collaborator_id) : null;
      const cc: any = pl?.cost_center_id ? ccMap.get(pl.cost_center_id) : null;
      const responsibleName = coll?.name || pl?.responsible_name || fallbackMap.get(phone) || '';
      const responsibleId = coll?.external_id || pl?.responsible_id || '';
      return {
        id: pl?._id || `temp-${phone}`,
        costCenterCode: cc?.code || '',
        costCenterName: cc?.name || 'Unallocated',
        phoneNumber: phone,
        responsibleName,
        responsibleId,
        collaboratorId: pl?.collaborator_id || null,
      };
    });

    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      items = items.filter((it) =>
        regex.test(it.phoneNumber) || regex.test(it.responsibleName) || regex.test(it.costCenterName) || regex.test(it.costCenterCode)
      );
    }

    items.sort((a, b) => {
      const aHas = a.costCenterCode ? 0 : 1;
      const bHas = b.costCenterCode ? 0 : 1;
      if (aHas !== bHas) return aHas - bHas;
      if (a.costCenterCode !== b.costCenterCode) return a.costCenterCode < b.costCenterCode ? -1 : 1;
      return a.phoneNumber < b.phoneNumber ? -1 : a.phoneNumber > b.phoneNumber ? 1 : 0;
    });

    const total = items.length;
    const paged = items.slice(offset, offset + PAGE_SIZE);

    return NextResponse.json({ items: paged, total, hasMore: offset + paged.length < total });
  } catch (error: any) {
    if (error.message === 'Token not provided' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error generating phone lines report' }, { status: 500 });
  }
}
