import { NextRequest, NextResponse } from 'next/server';
export const maxDuration = 60;
import { connectDB } from '@/lib/config/database';
import { verifyToken } from '@/lib/utils/jwt';
import { findOrCreate } from '@/lib/utils/db';
import CostCenter from '@/lib/models/CostCenter';
import Collaborator from '@/lib/models/Collaborator';
import PhoneLine from '@/lib/models/PhoneLine';
import { logOperation } from '@/lib/utils/auditLogger';

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
  if (lines.length < 2) return { rows: [] as Array<{ phone: string; name: string; cpf: string; costCenter: string }>, error: 'CSV must have a header and at least one line of data' };

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

  return { rows, error: null as string | null };
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
    const decoded = getAuthUser(request);
    const { content, workspaceId } = await request.json();
    if (!workspaceId) return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });
    if (!content) return NextResponse.json({ error: 'Content is required' }, { status: 400 });

    const { rows, error } = parseCSV(content);
    if (error) return NextResponse.json({ error }, { status: 400 });
    if (!rows.length) return NextResponse.json({ error: 'No valid rows found' }, { status: 400 });

    const stats: Record<string, any> = {
      collaboratorsCreated: 0, collaboratorsUpdated: 0,
      costCentersCreated: 0, costCentersFound: 0,
      phoneLinesCreated: 0, phoneLinesUpdated: 0,
      skipped: 0, costCentersCreatedNames: [],
      costCenterCache: {} as Record<string, string>,
      collaboratorCache: {} as Record<string, string>,
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowErrors = validateRow(row, i + 2);
      if (rowErrors.length > 0) { stats.skipped++; continue; }

      try {
        let costCenterId: string | null = null;
        if (row.costCenter) {
          const ccName = row.costCenter.trim();
          if (stats.costCenterCache[ccName]) {
            costCenterId = stats.costCenterCache[ccName];
          } else {
            const [cc, created]: [any, boolean] = await findOrCreate(CostCenter,
              { name: ccName, workspace_id: workspaceId },
              { code: ccName.toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 50) }
            );
            costCenterId = cc.id;
            stats.costCenterCache[ccName] = cc.id;
            if (created) { stats.costCentersCreated++; stats.costCentersCreatedNames.push(ccName); }
            else stats.costCentersFound++;
          }
        }

        let collaboratorId: string;
        if (stats.collaboratorCache[row.cpf]) {
          collaboratorId = stats.collaboratorCache[row.cpf];
        } else {
          const [collab, collabCreated]: [any, boolean] = await findOrCreate(Collaborator,
            { external_id: row.cpf, workspace_id: workspaceId },
            { name: row.name }
          );
          if (!collabCreated) { collab.name = row.name; await collab.save(); stats.collaboratorsUpdated++; }
          else stats.collaboratorsCreated++;
          collaboratorId = collab.id;
          stats.collaboratorCache[row.cpf] = collab.id;
        }

        if (row.phone) {
          const [pl, plCreated]: [any, boolean] = await findOrCreate(PhoneLine,
            { phone_number: row.phone, workspace_id: workspaceId },
            { responsible_name: row.name, collaborator_id: collaboratorId, cost_center_id: costCenterId }
          );
          if (!plCreated) {
            pl.responsible_name = row.name;
            pl.collaborator_id = collaboratorId;
            if (costCenterId) pl.cost_center_id = costCenterId;
            await pl.save();
            stats.phoneLinesUpdated++;
          } else stats.phoneLinesCreated++;
        }
      } catch { stats.skipped++; }
    }

    await logOperation({
      user_id: decoded.id, workspace_id: workspaceId,
      action: 'IMPORT', entity: 'Collaborator', entity_id: 'csv-batch',
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      payload: stats
    });

    return NextResponse.json({
      message: `${stats.collaboratorsCreated + stats.collaboratorsUpdated} collaborators processed (${stats.collaboratorsCreated} created, ${stats.collaboratorsUpdated} updated), ${stats.phoneLinesCreated + stats.phoneLinesUpdated} phone lines, ${stats.costCentersCreated} cost centers created`,
      ...stats,
    }, { status: 201 });
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error importing CSV' }, { status: 500 });
  }
}
