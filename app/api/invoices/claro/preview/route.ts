import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) throw new Error('Token not provided');
  const [, token] = authHeader.split(' ');
  return jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key') as { id: string; email: string; profile: string };
}

function validateClaroLine(line: string, lineIndex: number) {
  const errors: string[] = [];
  if (!line.startsWith('30')) return errors;
  if (line.length < 107) {
    errors.push(`Line ${lineIndex}: line too short (${line.length} characters, expected >= 107)`);
    return errors;
  }
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
    if (lineErrors.length > 0) {
      invalidItems.push({ line: li + 1, content: line.substring(0, 80), errors: lineErrors });
      continue;
    }

    const source_phone = line.substring(2, 27).trim();
    const dataServico = line.substring(27, 35);
    const item_date = `${dataServico.substring(0, 4)}-${dataServico.substring(4, 6)}-${dataServico.substring(6, 8)}`;
    const horaServico = line.substring(43, 49);
    const item_time = `${horaServico.substring(0, 2)}:${horaServico.substring(2, 4)}:${horaServico.substring(4, 6)}`;
    const total_value = parseFloat(line.substring(93, 106)) / 100;

    if (source_phone && !processedPhones.has(source_phone)) processedPhones.add(source_phone);

    items.push({
      workspace_id: workspaceId, operator: 'claro', source_phone, item_date, item_time,
      description: line.substring(49, 93).trim(), total_value, charged_value: total_value,
    });
  }

  return { items, invalidItems, processedPhones };
}

function cleanContent(content: string) {
  if (!content) return content;
  const mapping = [
    { pattern: /Periodo/g, replacement: 'Period' },
    { pattern: /Referencia/g, replacement: 'Reference' },
    { pattern: /No\. Cliente/g, replacement: 'No. Customer' },
    { pattern: /Identificacao/g, replacement: 'Identification' },
    { pattern: /debito/g, replacement: 'debit' },
    { pattern: /automatico/g, replacement: 'automatic' },
    { pattern: /Secao/g, replacement: 'Section' },
    { pattern: /Duracao/g, replacement: 'Duration' },
    { pattern: /Matricula/g, replacement: 'Registration' },
    { pattern: /Descricao/g, replacement: 'Description' },
    { pattern: /Codigo/g, replacement: 'Code' },
    { pattern: /Bonus/g, replacement: 'Bonus' },
    { pattern: /Sinalizacao/g, replacement: 'Signaling' },
    { pattern: /Numero/g, replacement: 'Number' },
    { pattern: /Sub-Secao/g, replacement: 'Sub-Section' },
    { pattern: /Navegacao/g, replacement: 'Navigation' },
    { pattern: /Padrao/g, replacement: 'Default' },
    { pattern: /Pos/g, replacement: 'Post' },
    { pattern: /Servicos/g, replacement: 'Services' },
    { pattern: /Operacao/g, replacement: 'Operation' },
    { pattern: /Promocao/g, replacement: 'Promotion' },
  ];
  let cleaned = content;
  mapping.forEach(m => { cleaned = cleaned.replace(m.pattern, m.replacement as any); });
  cleaned = cleaned.replace(/[\uFFFD]/g, '');
  return cleaned;
}

export async function POST(request: NextRequest) {
  try {
    getAuthUser(request);
    let { content, workspaceId } = await request.json();
    if (!workspaceId) return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });
    if (!content) return NextResponse.json({ error: 'Content is required' }, { status: 400 });

    content = cleanContent(content);
    const { items, invalidItems, processedPhones } = parseAndValidateClaro(content, workspaceId);

    return NextResponse.json({
      total: items.length + invalidItems.length,
      validCount: items.length,
      invalidCount: invalidItems.length,
      invalidItems: invalidItems.slice(0, 100),
      phonesDiscovered: Array.from(processedPhones),
      preview: items.slice(0, 5),
    });
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error previewing Claro invoices' }, { status: 500 });
  }
}
