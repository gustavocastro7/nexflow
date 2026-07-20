import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/config/database';
import { verifyToken } from '@/lib/utils/jwt';
import Workspace from '@/lib/models/Workspace';
import Invoice from '@/lib/models/Invoice';
import PhoneLine from '@/lib/models/PhoneLine';
import CostCenter from '@/lib/models/CostCenter';
import { logOperation } from '@/lib/utils/auditLogger';

function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) throw new Error('Token not provided');
  const [, token] = authHeader.split(' ');
  return verifyToken(token) as { id: string; email: string; profile: string };
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const decoded = getAuthUser(request);
    const { searchParams } = request.nextUrl;
    const workspaceId = searchParams.get('workspaceId');
    const mes = searchParams.get('mes');
    const ano = searchParams.get('ano');
    const centroCustoId = searchParams.get('centroCustoId');
    const telefone = searchParams.get('telefone');

    if (!workspaceId) return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });

    await logOperation({
      user_id: decoded.id, workspace_id: workspaceId,
      action: 'REPORT', entity: 'SpendingByCostCenter',
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      payload: { mes, ano, centroCustoId, telefone }
    });

    const workspace: any = await Workspace.findById(workspaceId);
    const startDay = workspace?.billing_cycle_start_day || 1;

    const filter: Record<string, any> = { workspace_id: workspaceId };

    if (mes && ano) {
      let startDate: string, endDate: string;
      if (startDay === 1) {
        startDate = `${ano}-${mes.padStart(2, '0')}-01`;
        endDate = new Date(parseInt(ano), parseInt(mes), 0).toISOString().split('T')[0];
      } else {
        const sd = new Date(parseInt(ano), parseInt(mes) - 1, startDay);
        const ed = new Date(parseInt(ano), parseInt(mes), startDay - 1);
        startDate = sd.toISOString().split('T')[0];
        endDate = ed.toISOString().split('T')[0];
      }
      filter.item_date = { $gte: startDate, $lte: endDate };
    } else if (ano) {
      filter.item_date = { $gte: `${ano}-01-01`, $lte: `${ano}-12-31` };
    }

    if (telefone) filter.source_phone = telefone;

    const allInvoices: any[] = await Invoice.find(filter)
      .select('operator source_phone item_date item_time description charged_value')
      .lean();

    const phones = [...new Set(allInvoices.map((i) => i.source_phone).filter(Boolean))];
    const phoneLines: any[] = await PhoneLine.find({ workspace_id: workspaceId, phone_number: { $in: phones } })
      .select('phone_number cost_center_id').lean();
    const ccIds = [...new Set(phoneLines.map((p) => p.cost_center_id).filter(Boolean))];
    const costCenters: any[] = await CostCenter.find({ _id: { $in: ccIds } }).select('name').lean();
    const ccNameMap = new Map(costCenters.map((c) => [c._id, c.name]));
    const phoneToCC = new Map(phoneLines.map((p) => [p.phone_number, p.cost_center_id ? { id: p.cost_center_id, name: ccNameMap.get(p.cost_center_id) } : null]));

    const enriched = allInvoices.map((f) => {
      const cc = phoneToCC.get(f.source_phone) || null;
      return { ...f, cc_id: cc?.id, cc_name: cc?.name };
    });

    const summaryMap = new Map();
    enriched.forEach((f: any) => {
      const ccId = f.cc_id || 'unallocated';
      if (!summaryMap.has(ccId)) summaryMap.set(ccId, { id: ccId, name: f.cc_name || 'Unallocated', total: 0, phones: new Set() });
      const s = summaryMap.get(ccId);
      s.total += parseFloat(f.charged_value || 0);
      if (f.source_phone) s.phones.add(f.source_phone);
    });

    let summary = Array.from(summaryMap.values()).map((s: any) => ({ ...s, phones: Array.from(s.phones) }));
    if (centroCustoId) summary = summary.filter((s: any) => s.id === centroCustoId);

    const detailsMap = new Map();
    enriched.forEach((f: any) => {
      const phone = f.source_phone || 'Unknown';
      if (!detailsMap.has(phone)) detailsMap.set(phone, { phone, costCenter: f.cc_name || 'Unallocated', total: 0, recordCount: 0 });
      const d = detailsMap.get(phone);
      d.total += parseFloat(f.charged_value || 0);
      d.recordCount++;
    });
    const details = Array.from(detailsMap.values());

    const general = enriched.map((f: any) => ({
      id: f._id, operator: f.operator, phone: f.source_phone, date: f.item_date, time: f.item_time,
      service: f.description, value: parseFloat(f.charged_value || 0), costCenter: f.cc_name || 'Unallocated',
    })).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({ summary, details, general });
  } catch (error: any) {
    if (error.message === 'Token not provided' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error generating report' }, { status: 500 });
  }
}
