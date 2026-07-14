import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import PhoneLine from '@/lib/models/PhoneLine';
import Collaborator from '@/lib/models/Collaborator';
import CostCenter from '@/lib/models/CostCenter';

function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) throw new Error('Token not provided');
  const [, token] = authHeader.split(' ');
  return jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key') as { id: string; email: string; profile: string };
}

export async function GET(request: NextRequest) {
  try {
    getAuthUser(request);
    const workspaceId = request.nextUrl.searchParams.get('workspaceId');
    if (!workspaceId) return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });

    const lines: any = await PhoneLine.findAll({
      where: { workspace_id: workspaceId },
      include: [
        { model: Collaborator, as: 'collaborator', attributes: ['id', 'name'] },
        { model: CostCenter, as: 'costCenter', attributes: ['id', 'name', 'code'] }
      ],
      order: [['phone_number', 'ASC']]
    });
    return NextResponse.json(lines);
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error listing phone lines' }, { status: 500 });
  }
}
