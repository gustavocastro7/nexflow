import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) throw new Error('Token not provided');
  const [, token] = authHeader.split(' ');
  return jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key') as { id: string; email: string; profile: string };
}

function validateVivoLine(parts: string[], lineIndex: number) {
  const errors: string[] = [];
  if (parts.length < 7) { errors.push(`Line ${lineIndex}: too few fields (${parts.length}, expected >= 7)`); return errors; }
  if (!parts[2] || parts[2].trim() === '') errors.push(`Line ${lineIndex}: Empty source phone`);
  if (parts[0] && parts[0].includes('/')) {
    const dateParts = parts[0].split('/');
    if (dateParts.length !== 3) errors.push(`Line ${lineIndex}: Invalid date format`);
  }
  return errors;
}

function parseAndValidateVivo(content: string, workspaceId: string) {
  const lines = content.split('\n');
  const items: any[] = [];
  const invalidItems: any[] = [];
  const processedPhones = new Set<string>();
  const startIndex = lines[0]?.includes('Data') ? 1 : 0;

  for (let li = startIndex; li < lines.length; li++) {
    const line = lines[li].trim();
    if (!line) continue;
    const parts = line.split('\t');
    const lineErrors = validateVivoLine(parts, li + 1);
    if (lineErrors.length > 0) { invalidItems.push({ line: li + 1, content: line.substring(0, 80), errors: lineErrors }); continue; }

    let item_date = parts[0];
    if (item_date.includes('/')) {
      const [d, m, y] = item_date.split('/');
      item_date = `${y}-${m}-${d}`;
    }

    const phone = parts[2];
    if (phone && !processedPhones.has(phone)) processedPhones.add(phone);

    items.push({
      workspace_id: workspaceId, operator: 'vivo', item_date, item_time: parts[1],
      source_phone: phone, destination_phone: parts[3], duration: parts[4],
      description: parts[5], charged_value: parseFloat(parts[6].replace(',', '.')),
      total_value: parseFloat(parts[6].replace(',', '.')),
    });
  }
  return { items, invalidItems, processedPhones };
}

export async function POST(request: NextRequest) {
  try {
    getAuthUser(request);
    const { content, workspaceId } = await request.json();
    if (!workspaceId) return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });
    if (!content) return NextResponse.json({ error: 'Content is required' }, { status: 400 });

    const { items, invalidItems, processedPhones } = parseAndValidateVivo(content, workspaceId);

    return NextResponse.json({
      total: items.length + invalidItems.length, validCount: items.length,
      invalidCount: invalidItems.length, invalidItems: invalidItems.slice(0, 100),
      phonesDiscovered: Array.from(processedPhones), preview: items.slice(0, 5),
    });
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error previewing Vivo invoices' }, { status: 500 });
  }
}
