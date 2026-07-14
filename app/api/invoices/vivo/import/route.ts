import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
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
  return jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key') as { id: string; email: string; profile: string };
}

function validateVivoLine(parts: string[], lineIndex: number) {
  const errors: string[] = [];
  if (parts.length < 7) { errors.push(`Line ${lineIndex}: too few fields`); return errors; }
  if (!parts[2] || parts[2].trim() === '') errors.push(`Line ${lineIndex}: Empty source phone`);
  return errors;
}

function parseAndValidateVivo(content: string, workspaceId: string) {
  const lines = content.split('\n');
  const items: any[] = []; const invalidItems: any[] = []; const processedPhones = new Set<string>();
  const startIndex = lines[0]?.includes('Data') ? 1 : 0;
  for (let li = startIndex; li < lines.length; li++) {
    const line = lines[li].trim();
    if (!line) continue;
    const parts = line.split('\t');
    const lineErrors = validateVivoLine(parts, li + 1);
    if (lineErrors.length > 0) { invalidItems.push({ line: li + 1, content: line.substring(0, 80), errors: lineErrors }); continue; }
    let item_date = parts[0];
    if (item_date.includes('/')) { const [d, m, y] = item_date.split('/'); item_date = `${y}-${m}-${d}`; }
    const phone = parts[2];
    if (phone && !processedPhones.has(phone)) processedPhones.add(phone);
    items.push({ workspace_id: workspaceId, operator: 'vivo', item_date, item_time: parts[1], source_phone: phone, destination_phone: parts[3], duration: parts[4], description: parts[5], charged_value: parseFloat(parts[6].replace(',', '.')), total_value: parseFloat(parts[6].replace(',', '.')) });
  }
  return { items, invalidItems, processedPhones };
}

async function ensurePhoneLine(phoneNumber: string, workspaceId: string, costCenterId?: string) {
  if (!phoneNumber) return;
  const existing: any = await PhoneLine.findOne({ where: { phone_number: phoneNumber, workspace_id: workspaceId } });
  if (existing) { if (costCenterId && !existing.cost_center_id) await existing.update({ cost_center_id: costCenterId }); return; }
  let targetCC = costCenterId;
  if (!targetCC) {
    const [matriz]: [any, boolean] = await CostCenter.findOrCreate({
      where: { name: 'Matriz', workspace_id: workspaceId },
      defaults: { code: 'MATRIZ', name: 'Matriz', description: 'Default Cost Center', workspace_id: workspaceId }
    });
    targetCC = matriz.id;
  }
  await PhoneLine.create({ phone_number: phoneNumber, cost_center_id: targetCC, workspace_id: workspaceId, responsible_name: 'New Number (Auto)' });
}

export async function POST(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);
    const { content, workspaceId, costCenterId } = await request.json();
    if (!workspaceId) return NextResponse.json({ error: 'Workspace ID is required for import' }, { status: 400 });
    if (costCenterId) {
      const cc: any = await CostCenter.findOne({ where: { id: costCenterId, workspace_id: workspaceId } });
      if (!cc) return NextResponse.json({ error: 'Cost center not found in this workspace' }, { status: 400 });
    }

    const hash = crypto.createHash('md5').update(content).digest('hex');
    const existing: any = await RawInvoice.findOne({ where: { hash, workspace_id: workspaceId, operator: 'vivo' } });
    if (existing) return NextResponse.json({ error: 'This invoice has already been imported for this workspace.' }, { status: 400 });

    const { items, invalidItems, processedPhones } = parseAndValidateVivo(content, workspaceId);
    if (items.length === 0) return NextResponse.json({ error: 'No valid records found for import' }, { status: 400 });

    const raw: any = await RawInvoice.create({
      workspace_id: workspaceId, operator: 'vivo',
      content: { raw: content, validation: { total: items.length + invalidItems.length, skipped: invalidItems.length } },
      hash, processing_status: 'processado', due_date: null
    });

    for (const phone of processedPhones) await ensurePhoneLine(phone, workspaceId, costCenterId);
    await Invoice.bulkCreate(items.map(item => ({ ...item, raw_invoice_id: raw.id })));

    await logOperation({
      user_id: decoded.id, workspace_id: workspaceId,
      action: 'IMPORT', entity: 'RawInvoice', entity_id: raw.id,
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      payload: { operator: 'vivo', itemCount: items.length, skipped: invalidItems.length, costCenterId }
    });

    const msg = `${items.length} Vivo items imported successfully${invalidItems.length > 0 ? ` (${invalidItems.length} lines skipped)` : ''}`;
    return NextResponse.json({ message: msg, imported: items.length, skipped: invalidItems.length }, { status: 201 });
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error importing Vivo invoices' }, { status: 500 });
  }
}
