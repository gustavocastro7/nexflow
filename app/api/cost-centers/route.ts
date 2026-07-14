import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import CostCenter from '@/lib/models/CostCenter';
import { logOperation } from '@/lib/utils/auditLogger';

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

    const centers: any = await CostCenter.findAll({
      where: { workspace_id: workspaceId },
      order: [['name', 'ASC']]
    });
    return NextResponse.json(centers);
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error listing cost centers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);
    const { name, description, phones, workspaceId } = await request.json();
    if (!name || !workspaceId) {
      return NextResponse.json({ error: 'Name and Workspace ID are required' }, { status: 400 });
    }

    const center: any = await CostCenter.create({
      name, description, phones: phones || [], workspace_id: workspaceId
    });

    await logOperation({
      user_id: decoded.id, workspace_id: workspaceId,
      action: 'CREATE', entity: 'CostCenter', entity_id: center.id,
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      payload: { name }
    });

    return NextResponse.json(center, { status: 201 });
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error creating cost center' }, { status: 500 });
  }
}
