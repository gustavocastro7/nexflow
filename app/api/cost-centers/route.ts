import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/config/database';
import { verifyToken } from '@/lib/utils/jwt';
import CostCenter from '@/lib/models/CostCenter';
import { logOperation } from '@/lib/utils/auditLogger';

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

    const centers: any = await CostCenter.find({ workspace_id: workspaceId }).sort({ name: 1 });
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
    await connectDB();
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
