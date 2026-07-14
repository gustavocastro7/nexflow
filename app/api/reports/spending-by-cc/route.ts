import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getSequelize } from '@/lib/config/database';
import Workspace from '@/lib/models/Workspace';
import { logOperation } from '@/lib/utils/auditLogger';

function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) throw new Error('Token not provided');
  const [, token] = authHeader.split(' ');
  return jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key') as { id: string; email: string; profile: string };
}

export async function GET(request: NextRequest) {
  try {
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

    const sequelize = getSequelize();
    const workspace: any = await Workspace.findByPk(workspaceId);
    const startDay = workspace?.billing_cycle_start_day || 1;

    const replacements: Record<string, any> = { workspaceId };
    let whereSql = 'WHERE i.workspace_id = :workspaceId';

    if (mes && ano) {
      if (startDay === 1) {
        whereSql += ' AND i.item_date BETWEEN :startDate AND :endDate';
        replacements.startDate = `${ano}-${mes.padStart(2, '0')}-01`;
        replacements.endDate = new Date(parseInt(ano), parseInt(mes), 0).toISOString().split('T')[0];
      } else {
        const startDate = new Date(parseInt(ano), parseInt(mes) - 1, startDay);
        const endDate = new Date(parseInt(ano), parseInt(mes), startDay - 1);
        whereSql += ' AND i.item_date BETWEEN :startDate AND :endDate';
        replacements.startDate = startDate.toISOString().split('T')[0];
        replacements.endDate = endDate.toISOString().split('T')[0];
      }
    } else if (ano) {
      whereSql += ' AND i.item_date BETWEEN :anoStart AND :anoEnd';
      replacements.anoStart = `${ano}-01-01`;
      replacements.anoEnd = `${ano}-12-31`;
    }

    if (telefone) { whereSql += ' AND i.source_phone = :telefone'; replacements.telefone = telefone; }

    const [allInvoices]: any[] = await sequelize.query(`
      SELECT i.id, i.operator, i.source_phone, i.item_date, i.item_time, i.description, i.charged_value,
        cc.id AS cc_id, cc.name AS cc_name
      FROM invoices i LEFT JOIN phone_lines pl ON pl.phone_number = i.source_phone AND pl.workspace_id = i.workspace_id
      LEFT JOIN cost_centers cc ON cc.id = pl.cost_center_id ${whereSql}
    `, { replacements });

    const summaryMap = new Map();
    allInvoices.forEach((f: any) => {
      const ccId = f.cc_id || 'unallocated';
      if (!summaryMap.has(ccId)) summaryMap.set(ccId, { id: ccId, name: f.cc_name || 'Unallocated', total: 0, phones: new Set() });
      const s = summaryMap.get(ccId);
      s.total += parseFloat(f.charged_value || 0);
      if (f.source_phone) s.phones.add(f.source_phone);
    });

    let summary = Array.from(summaryMap.values()).map((s: any) => ({ ...s, phones: Array.from(s.phones) }));
    if (centroCustoId) summary = summary.filter((s: any) => s.id === centroCustoId);

    const detailsMap = new Map();
    allInvoices.forEach((f: any) => {
      const phone = f.source_phone || 'Unknown';
      if (!detailsMap.has(phone)) detailsMap.set(phone, { phone, costCenter: f.cc_name || 'Unallocated', total: 0, recordCount: 0 });
      const d = detailsMap.get(phone);
      d.total += parseFloat(f.charged_value || 0);
      d.recordCount++;
    });
    const details = Array.from(detailsMap.values());

    const general = allInvoices.map((f: any) => ({
      id: f.id, operator: f.operator, phone: f.source_phone, date: f.item_date, time: f.item_time,
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
