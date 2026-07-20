import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/config/database';
import { verifyToken } from '@/lib/utils/jwt';
import PhoneLine from '@/lib/models/PhoneLine';
import Collaborator from '@/lib/models/Collaborator';
import CostCenter from '@/lib/models/CostCenter';

function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) throw new Error('Token not provided');
  const [, token] = authHeader.split(' ');
  return verifyToken(token) as { id: string; email: string; profile: string };
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    getAuthUser(request);
    const workspaceId = request.nextUrl.searchParams.get('workspaceId');
    if (!workspaceId) return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });

    const lines: any[] = await PhoneLine.find({ workspace_id: workspaceId }).sort({ phone_number: 1 });

    const collaboratorIds = [...new Set(lines.map((l) => l.collaborator_id).filter(Boolean))];
    const costCenterIds = [...new Set(lines.map((l) => l.cost_center_id).filter(Boolean))];

    const collaborators = await Collaborator.find({ _id: { $in: collaboratorIds } }).select('name');
    const costCenters = await CostCenter.find({ _id: { $in: costCenterIds } }).select('name code');

    const collabMap = new Map(collaborators.map((c: any) => [c.id, { id: c.id, name: c.name }]));
    const ccMap = new Map(costCenters.map((c: any) => [c.id, { id: c.id, name: c.name, code: c.code }]));

    const result = lines.map((l) => {
      const obj: any = l.toObject();
      obj.collaborator = l.collaborator_id ? collabMap.get(l.collaborator_id) || null : null;
      obj.costCenter = l.cost_center_id ? ccMap.get(l.cost_center_id) || null : null;
      return obj;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error listing phone lines' }, { status: 500 });
  }
}
