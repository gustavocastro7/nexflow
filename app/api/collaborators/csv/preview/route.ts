import { NextRequest, NextResponse } from 'next/server';
export const maxDuration = 60;
import { connectDB } from '@/lib/config/database';
import { verifyToken } from '@/lib/utils/jwt';
import CostCenter from '@/lib/models/CostCenter';
import Collaborator from '@/lib/models/Collaborator';

function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) throw new Error('Token not provided');
  const [, token] = authHeader.split(' ');
  return verifyToken(token) as { id: string; email: string; profile: string };
}

function detectDelimiter(firstLine: string) {
  const semicolons = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return semicolons >= commas ? ';' : ',';
}

function parseCSV(content: string) {
  const lines = content.split('\n').filter(l => l.trim().length > 0);
  if (lines.length < 2) return { rows: [], columnMap: null as Record<string, number> | null, error: 'CSV must have a header and at least one line of data' };

  const delimiter = detectDelimiter(lines[0]);
  const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase().replace(/[^a-z0-9_ ]/g, ''));

  const colNames: Record<string, string> = {
    'nr': 'phone', 'numero': 'phone', 'telefone': 'phone', 'phone': 'phone',
    'nome': 'name', 'name': 'name',
    'cpf': 'cpf', 'documento': 'cpf', 'doc': 'cpf',
    'centrodecusto': 'costcenter', 'centro de custo': 'costcenter', 'cc': 'costcenter', 'costcenter': 'costcenter', 'cost_center': 'costcenter'
  };

  const columnMap: Record<string, number> = {};
  headers.forEach((h, i) => {
    const mapped = colNames[h] || colNames[h.replace(/[\s_-]/g, '')];
    if (mapped) columnMap[mapped] = i;
  });

  const rows: Array<{ phone: string; name: string; cpf: string; costCenter: string }> = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(delimiter).map(p => p.trim());
    rows.push({
      phone: columnMap.phone !== undefined ? parts[columnMap.phone] || '' : '',
      name: columnMap.name !== undefined ? parts[columnMap.name] || '' : '',
      cpf: columnMap.cpf !== undefined ? parts[columnMap.cpf] || '' : '',
      costCenter: columnMap.costcenter !== undefined ? parts[columnMap.costcenter] || '' : '',
    });
  }

  return { rows, columnMap, error: null as string | null };
}

function validateRow(row: { phone: string; name: string; cpf: string; costCenter: string }, index: number) {
  const errors: string[] = [];
  if (!row.cpf || row.cpf.trim() === '') errors.push('Empty CPF');
  if (!row.name || row.name.trim() === '') errors.push('Empty name');
  return errors;
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    getAuthUser(request);
    const { content, workspaceId } = await request.json();
    if (!workspaceId) return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });
    if (!content) return NextResponse.json({ error: 'Content is required' }, { status: 400 });

    const { rows, columnMap, error } = parseCSV(content);
    if (error) return NextResponse.json({ error }, { status: 400 });
    if (!columnMap?.name || !columnMap?.cpf) {
      return NextResponse.json({ error: 'CSV must contain name and CPF columns' }, { status: 400 });
    }

    type RowType = { phone: string; name: string; cpf: string; costCenter: string };
    const invalidRows: Array<{ row: number; data: RowType; errors: string[] }> = [];
    const validRows: RowType[] = [];

    rows.forEach((row, i) => {
      const errors = validateRow(row, i + 2);
      if (errors.length > 0) invalidRows.push({ row: i + 2, data: row, errors });
      else validRows.push(row);
    });

    const costCenterNames = [...new Set(validRows.map(r => r.costCenter).filter(Boolean))];
    const existingCCs: any[] = costCenterNames.length > 0 ? await CostCenter.find({
      name: { $in: costCenterNames }, workspace_id: workspaceId
    }) : [];
    const existingCCNames = new Set(existingCCs.map(cc => cc.name));
    const costCentersToCreate = costCenterNames.filter(n => !existingCCNames.has(n));

    const existingCpf: any[] = await Collaborator.find({
      external_id: { $in: validRows.map(r => r.cpf) }, workspace_id: workspaceId
    }).select('external_id');
    const existingCpfs = new Set(existingCpf.map(c => c.external_id));
    const toCreate = validRows.filter(r => !existingCpfs.has(r.cpf)).length;
    const toUpdate = validRows.length - toCreate;

    return NextResponse.json({
      total: rows.length,
      validCount: validRows.length,
      invalidCount: invalidRows.length,
      invalidRows: invalidRows.slice(0, 100),
      toCreate, toUpdate,
      costCentersFound: existingCCs.length,
      costCentersToCreate: costCentersToCreate.length,
      costCentersToCreateNames: costCentersToCreate.slice(0, 20),
    });
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error previewing CSV' }, { status: 500 });
  }
}
