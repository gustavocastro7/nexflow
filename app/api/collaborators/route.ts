import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/config/database';
import { verifyToken } from '@/lib/utils/jwt';
import Collaborator from '@/lib/models/Collaborator';
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
    const search = request.nextUrl.searchParams.get('search');
    if (!workspaceId) return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });

    const where: Record<string, any> = { workspace_id: workspaceId };
    if (search) where.name = { $regex: search, $options: 'i' };

    const collaborators: any = await Collaborator.find(where).sort({ name: 1 });
    return NextResponse.json(collaborators);
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error listing collaborators' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const decoded = getAuthUser(request);
    const { name, external_id, email, department, workspace_id } = await request.json();
    if (!name || !workspace_id) {
      return NextResponse.json({ error: 'Name and Workspace ID are required' }, { status: 400 });
    }

    const collaborator: any = await Collaborator.create({
      name, external_id, email, department, workspace_id
    });

    await logOperation({
      user_id: decoded.id, workspace_id,
      action: 'CREATE', entity: 'Collaborator', entity_id: collaborator.id,
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      payload: { name, email, external_id }
    });

    return NextResponse.json(collaborator, { status: 201 });
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error creating collaborator' }, { status: 500 });
  }
}
