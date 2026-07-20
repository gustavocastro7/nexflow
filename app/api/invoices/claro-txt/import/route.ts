import { NextRequest, NextResponse } from 'next/server';
export const maxDuration = 60;
import { connectDB } from '@/lib/config/database';
import { verifyToken } from '@/lib/utils/jwt';
import { findOrCreate } from '@/lib/utils/db';
import crypto from 'crypto';
import RawInvoice from '@/lib/models/RawInvoice';
import Invoice from '@/lib/models/Invoice';
import CostCenter from '@/lib/models/CostCenter';
import PhoneLine from '@/lib/models/PhoneLine';
import { logOperation } from '@/lib/utils/auditLogger';

function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) throw new Error('Token not provided');
  const [, token] = authHeader.split(' ');
  return verifyToken(token) as { id: string; email: string; profile: string };
}

function cleanContent(content: string) {
  if (!content) return content;
  const mapping: Array<{ pattern: RegExp; replacement: string }> = [
    { pattern: /Periodo/g, replacement: 'Period' }, { pattern: /Referencia/g, replacement: 'Reference' },
    { pattern: /Identificacao/g, replacement: 'Identification' }, { pattern: /debito/g, replacement: 'debit' },
    { pattern: /Secao/g, replacement: 'Section' }, { pattern: /Duracao/g, replacement: 'Duration' },
    { pattern: /Descricao/g, replacement: 'Description' }, { pattern: /Numero/g, replacement: 'Number' },
    { pattern: /Navegacao/g, replacement: 'Navigation' }, { pattern: /Padrao/g, replacement: 'Default' },
    { pattern: /Pos/g, replacement: 'Post' }, { pattern: /Servicos/g, replacement: 'Services' },
    { pattern: /Operacao/g, replacement: 'Operation' }, { pattern: /Promocao/g, replacement: 'Promotion' },
  ];
  let cleaned = content;
  mapping.forEach(m => { cleaned = cleaned.replace(m.pattern, m.replacement as any); });
  cleaned = cleaned.replace(/[�]/g, '');
  return cleaned;
}

function parseValue(val: string) { if (!val) return 0; return parseFloat(val.replace(/\./g, '').replace(',', '.')) || 0; }

function parseAndValidateClaroTXT(content: string, workspaceId: string) {
  const lines = content.split('\n').map(l => l.trim());
  const items: any[] = []; const invalidItems: any[] = []; const processedPhones = new Set<string>();
  let startParsing = false;
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    if (line.startsWith('Tel;Se')) { startParsing = true; continue; }
    if (!startParsing || !line) continue;
    const parts = line.split(';');
    if (parts.length < 10) { invalidItems.push({ line: li + 1, content: line.substring(0, 80), errors: ['too few fields'] }); continue; }
    if (!parts[0] || parts[0].trim() === '') { invalidItems.push({ line: li + 1, content: line.substring(0, 80), errors: ['Empty source phone'] }); continue; }
    let item_date = parts[2];
    if (item_date && item_date.includes('/')) { const [d, m, y] = item_date.split('/'); item_date = `${y}-${m}-${d}`; }
    const phone = parts[0];
    if (phone && !processedPhones.has(phone)) processedPhones.add(phone);
    items.push({
      workspace_id: workspaceId, operator: 'claro_txt', source_phone: phone, section: parts[1],
      item_date: (item_date && item_date.length === 10) ? item_date : null, item_time: parts[3] || null,
      source_location: parts[4], destination_phone: parts[5], duration: parts[6], quantity: parseValue(parts[6]),
      total_value: parseValue(parts[8]), charged_value: parseValue(parts[9]),
      original_user: parts[10], original_cost_center: parts[11], sub_section: parts[13], tax_type: parts[14], description: parts[15],
    });
  }
  return { items, invalidItems, processedPhones };
}

async function ensurePhoneLine(phoneNumber: string, workspaceId: string, costCenterId?: string) {
  if (!phoneNumber) return;
  const existing: any = await PhoneLine.findOne({ phone_number: phoneNumber, workspace_id: workspaceId });
  if (existing) { if (costCenterId && !existing.cost_center_id) { existing.cost_center_id = costCenterId; await existing.save(); } return; }
  let targetCC = costCenterId;
  if (!targetCC) {
    const [matriz]: [any, boolean] = await findOrCreate(CostCenter,
      { name: 'Matriz', workspace_id: workspaceId },
      { code: 'MATRIZ', description: 'Default Cost Center' }
    );
    targetCC = matriz.id;
  }
  await PhoneLine.create({ phone_number: phoneNumber, cost_center_id: targetCC, workspace_id: workspaceId, responsible_name: 'New Number (Auto)' });
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const decoded = getAuthUser(request);
    let content: string; let workspaceId: string; let costCenterId: string | undefined;
    ({ content, workspaceId, costCenterId } = await request.json() as any);
    content = cleanContent(content);
    if (!workspaceId) return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });
    if (costCenterId) {
      const cc: any = await CostCenter.findOne({ _id: costCenterId, workspace_id: workspaceId });
      if (!cc) return NextResponse.json({ error: 'Cost center not found in this workspace' }, { status: 400 });
    }

    const hash = crypto.createHash('md5').update(content).digest('hex');
    const existing: any = await RawInvoice.findOne({ hash, workspace_id: workspaceId, operator: 'claro_txt' });
    if (existing) return NextResponse.json({ error: 'This invoice has already been imported.' }, { status: 400 });

    const lines = content.split('\n').map(l => l.trim());
    const headerInfo: Record<string, string> = {};
    lines.forEach(line => {
      if (line.includes('Due Date:')) {
        const match = line.match(/Due Date:\s*([\d/]+)/);
        if (match) headerInfo.data_vencimento = match[1];
        const valMatch = line.match(/Value:\s*R\$\s*([\d.,]+)/);
        if (valMatch) headerInfo.valor_total = valMatch[1];
      }
      if (line.includes('Customer:')) { const parts = line.split('Customer:'); if (parts[1]) headerInfo.cliente = parts[1].trim(); }
    });

    let due_date: string | null = null;
    if (headerInfo.data_vencimento) {
      const [d, m, y] = headerInfo.data_vencimento.split('/');
      due_date = `${y}-${m}-${d}`;
    }

    const { items, invalidItems, processedPhones } = parseAndValidateClaroTXT(content, workspaceId);
    if (items.length === 0) return NextResponse.json({ error: 'No valid records found for import' }, { status: 400 });

    const raw: any = await RawInvoice.create({
      workspace_id: workspaceId, operator: 'claro_txt',
      content: { raw: content, header: headerInfo, validation: { total: items.length + invalidItems.length, skipped: invalidItems.length } },
      due_date, hash, processing_status: 'processado'
    });

    for (const phone of processedPhones) await ensurePhoneLine(phone, workspaceId, costCenterId);
    const itemsToInsert = items.map(item => ({ ...item, raw_invoice_id: raw.id }));
    const chunkSize = 1000;
    for (let i = 0; i < itemsToInsert.length; i += chunkSize) {
      await Invoice.insertMany(itemsToInsert.slice(i, i + chunkSize));
    }

    await logOperation({
      user_id: decoded.id, workspace_id: workspaceId,
      action: 'IMPORT', entity: 'RawInvoice', entity_id: raw.id,
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      payload: { operator: 'claro_txt', itemCount: items.length, skipped: invalidItems.length, due_date, costCenterId }
    });

    const msg = `${items.length} Claro TXT items imported successfully${invalidItems.length > 0 ? ` (${invalidItems.length} lines skipped)` : ''}`;
    return NextResponse.json({ message: msg, imported: items.length, skipped: invalidItems.length }, { status: 201 });
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error importing Claro TXT' }, { status: 500 });
  }
}
