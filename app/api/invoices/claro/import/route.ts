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

function validateClaroLine(line: string, lineIndex: number) {
  const errors: string[] = [];
  if (!line.startsWith('30')) return errors;
  if (line.length < 107) { errors.push(`Line ${lineIndex}: line too short`); return errors; }
  const phone = line.substring(2, 27).trim();
  if (!phone) errors.push(`Line ${lineIndex}: Empty source phone`);
  const valStr = line.substring(93, 106);
  if (valStr.trim() === '' || isNaN(parseFloat(valStr))) errors.push(`Line ${lineIndex}: Invalid total value`);
  return errors;
}

function parseAndValidateClaro(content: string, workspaceId: string) {
  const lines = content.split('\n');
  const items: any[] = [];
  const invalidItems: any[] = [];
  const processedPhones = new Set<string>();
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    if (!line.startsWith('30')) continue;
    const lineErrors = validateClaroLine(line, li + 1);
    if (lineErrors.length > 0) { invalidItems.push({ line: li + 1, content: line.substring(0, 80), errors: lineErrors }); continue; }
    const source_phone = line.substring(2, 27).trim();
    const ds = line.substring(27, 35);
    const item_date = `${ds.substring(0, 4)}-${ds.substring(4, 6)}-${ds.substring(6, 8)}`;
    const hs = line.substring(43, 49);
    const item_time = `${hs.substring(0, 2)}:${hs.substring(2, 4)}:${hs.substring(4, 6)}`;
    const total_value = parseFloat(line.substring(93, 106)) / 100;
    if (source_phone && !processedPhones.has(source_phone)) processedPhones.add(source_phone);
    items.push({ workspace_id: workspaceId, operator: 'claro', source_phone, item_date, item_time, description: line.substring(49, 93).trim(), total_value, charged_value: total_value });
  }
  return { items, invalidItems, processedPhones };
}

function cleanContent(content: string) {
  if (!content) return content;
  const mapping = [
    { pattern: /Periodo/g, replacement: 'Period' }, { pattern: /Referencia/g, replacement: 'Reference' },
    { pattern: /No\. Cliente/g, replacement: 'No. Customer' }, { pattern: /Identificacao/g, replacement: 'Identification' },
    { pattern: /debito/g, replacement: 'debit' }, { pattern: /automatico/g, replacement: 'automatic' },
    { pattern: /Secao/g, replacement: 'Section' }, { pattern: /Duracao/g, replacement: 'Duration' },
    { pattern: /Matricula/g, replacement: 'Registration' }, { pattern: /Descricao/g, replacement: 'Description' },
    { pattern: /Codigo/g, replacement: 'Code' }, { pattern: /Bonus/g, replacement: 'Bonus' },
    { pattern: /Sinalizacao/g, replacement: 'Signaling' }, { pattern: /Numero/g, replacement: 'Number' },
    { pattern: /Sub-Secao/g, replacement: 'Sub-Section' }, { pattern: /Navegacao/g, replacement: 'Navigation' },
    { pattern: /Padrao/g, replacement: 'Default' }, { pattern: /Pos/g, replacement: 'Post' },
    { pattern: /Servicos/g, replacement: 'Services' }, { pattern: /Operacao/g, replacement: 'Operation' },
    { pattern: /Promocao/g, replacement: 'Promotion' },
  ];
  let cleaned = content;
  mapping.forEach(m => { cleaned = cleaned.replace(m.pattern, m.replacement as any); });
  cleaned = cleaned.replace(/[\uFFFD]/g, '');
  return cleaned;
}

async function ensurePhoneLine(phoneNumber: string, workspaceId: string, costCenterId?: string) {
  if (!phoneNumber) return;
  const existing: any = await PhoneLine.findOne({ where: { phone_number: phoneNumber, workspace_id: workspaceId } });
  if (existing) {
    if (costCenterId && !existing.cost_center_id) await existing.update({ cost_center_id: costCenterId });
    return;
  }
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
    let { content, workspaceId, costCenterId } = await request.json();
    content = cleanContent(content);

    if (!workspaceId) return NextResponse.json({ error: 'Workspace ID is required for import' }, { status: 400 });
    if (costCenterId) {
      const cc: any = await CostCenter.findOne({ where: { id: costCenterId, workspace_id: workspaceId } });
      if (!cc) return NextResponse.json({ error: 'Cost center not found in this workspace' }, { status: 400 });
    }

    const hash = crypto.createHash('md5').update(content).digest('hex');
    const existing: any = await RawInvoice.findOne({ where: { hash, workspace_id: workspaceId, operator: 'claro' } });
    if (existing) return NextResponse.json({ error: 'This invoice has already been imported for this workspace.' }, { status: 400 });

    const { items, invalidItems, processedPhones } = parseAndValidateClaro(content, workspaceId);
    if (items.length === 0) return NextResponse.json({ error: 'No valid records found for import' }, { status: 400 });

    const raw: any = await RawInvoice.create({
      workspace_id: workspaceId, operator: 'claro',
      content: { raw: content, validation: { total: items.length + invalidItems.length, skipped: invalidItems.length } },
      hash, processing_status: 'processado', due_date: null
    });

    for (const phone of processedPhones) await ensurePhoneLine(phone, workspaceId, costCenterId);
    await Invoice.bulkCreate(items.map(item => ({ ...item, raw_invoice_id: raw.id })));

    await logOperation({
      user_id: decoded.id, workspace_id: workspaceId,
      action: 'IMPORT', entity: 'RawInvoice', entity_id: raw.id,
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      payload: { operator: 'claro', itemCount: items.length, skipped: invalidItems.length, costCenterId }
    });

    const msg = `${items.length} Claro items imported successfully${invalidItems.length > 0 ? ` (${invalidItems.length} lines skipped)` : ''}`;
    return NextResponse.json({ message: msg, imported: items.length, skipped: invalidItems.length }, { status: 201 });
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error importing Claro invoices' }, { status: 500 });
  }
}
