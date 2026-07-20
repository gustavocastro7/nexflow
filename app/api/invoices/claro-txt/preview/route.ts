import { NextRequest, NextResponse } from 'next/server';
export const maxDuration = 60;
import { verifyToken } from '@/lib/utils/jwt';

function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) throw new Error('Token not provided');
  const [, token] = authHeader.split(' ');
  return verifyToken(token) as { id: string; email: string; profile: string };
}

function cleanContent(content: string) {
  if (!content) return content;
  const mapping = [
    { pattern: /Periodo/g, replacement: 'Period' }, { pattern: /Referencia/g, replacement: 'Reference' },
    { pattern: /Identificacao/g, replacement: 'Identification' }, { pattern: /debito/g, replacement: 'debit' },
    { pattern: /Secao/g, replacement: 'Section' }, { pattern: /Duracao/g, replacement: 'Duration' },
    { pattern: /Descricao/g, replacement: 'Description' }, { pattern: /Codigo/g, replacement: 'Code' },
    { pattern: /Bonus/g, replacement: 'Bonus' }, { pattern: /Sinalizacao/g, replacement: 'Signaling' },
    { pattern: /Numero/g, replacement: 'Number' }, { pattern: /Navegacao/g, replacement: 'Navigation' },
    { pattern: /Padrao/g, replacement: 'Default' }, { pattern: /Pos/g, replacement: 'Post' },
    { pattern: /Servicos/g, replacement: 'Services' }, { pattern: /Operacao/g, replacement: 'Operation' },
    { pattern: /Promocao/g, replacement: 'Promotion' },
  ];
  let cleaned = content;
  mapping.forEach(m => { cleaned = cleaned.replace(m.pattern, m.replacement as any); });
  cleaned = cleaned.replace(/[\uFFFD]/g, '');
  return cleaned;
}

function parseValue(val: string) {
  if (!val) return 0;
  const cleanVal = val.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleanVal) || 0;
}

function validateClaroTXTLine(parts: string[], lineIndex: number) {
  const errors: string[] = [];
  if (parts.length < 10) { errors.push(`Line ${lineIndex}: too few fields (${parts.length}, expected >= 10)`); return errors; }
  if (!parts[0] || parts[0].trim() === '') errors.push(`Line ${lineIndex}: Empty source phone`);
  return errors;
}

function parseAndValidateClaroTXT(content: string, workspaceId: string) {
  const lines = content.split('\n').map(l => l.trim());
  const items: any[] = []; const invalidItems: any[] = []; const processedPhones = new Set<string>();
  let startParsing = false;

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    if (line.startsWith('Tel;Se')) { startParsing = true; continue; }
    if (!startParsing || !line) continue;
    const parts = line.split(';');
    const lineErrors = validateClaroTXTLine(parts, li + 1);
    if (lineErrors.length > 0) { invalidItems.push({ line: li + 1, content: line.substring(0, 80), errors: lineErrors }); continue; }

    let item_date = parts[2];
    if (item_date && item_date.includes('/')) { const [d, m, y] = item_date.split('/'); item_date = `${y}-${m}-${d}`; }
    const phone = parts[0];
    if (phone && !processedPhones.has(phone)) processedPhones.add(phone);

    items.push({
      workspace_id: workspaceId, operator: 'claro_txt', source_phone: phone, section: parts[1],
      item_date: (item_date && item_date.length === 10) ? item_date : null, item_time: parts[3] || null,
      source_location: parts[4], destination_phone: parts[5], duration: parts[6], quantity: parseValue(parts[6]),
      total_value: parseValue(parts[8]), charged_value: parseValue(parts[9]), original_user: parts[10],
      original_cost_center: parts[11], sub_section: parts[13], tax_type: parts[14], description: parts[15],
    });
  }
  return { items, invalidItems, processedPhones };
}

export async function POST(request: NextRequest) {
  try {
    getAuthUser(request);
    let content: string; let workspaceId: string;
    ({ content, workspaceId } = await request.json() as any);
    if (!workspaceId) return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });
    if (!content) return NextResponse.json({ error: 'Content is required' }, { status: 400 });

    content = cleanContent(content);
    const { items, invalidItems, processedPhones } = parseAndValidateClaroTXT(content, workspaceId);

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

    return NextResponse.json({
      total: items.length + invalidItems.length, validCount: items.length,
      invalidCount: invalidItems.length, invalidItems: invalidItems.slice(0, 100),
      phonesDiscovered: Array.from(processedPhones), header: headerInfo, preview: items.slice(0, 5),
    });
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error previewing Claro TXT' }, { status: 500 });
  }
}
