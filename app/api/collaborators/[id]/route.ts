import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import Collaborator from '@/lib/models/Collaborator';
import { logOperation } from '@/lib/utils/auditLogger';

function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) throw new Error('Token not provided');
  const [, token] = authHeader.split(' ');
  return jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key') as { id: string; email: string; profile: string };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    getAuthUser(request);
    const { id } = await params;
    const collaborator: any = await Collaborator.findByPk(id);
    if (!collaborator) return NextResponse.json({ error: 'Collaborator not found' }, { status: 404 });
    return NextResponse.json(collaborator);
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error fetching collaborator' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const decoded = getAuthUser(request);
    const { id } = await params;
    const { name, external_id, email, department } = await request.json();

    const collaborator: any = await Collaborator.findByPk(id);
    if (!collaborator) return NextResponse.json({ error: 'Collaborator not found' }, { status: 404 });

    await collaborator.update({ name, external_id, email, department });

    await logOperation({
      user_id: decoded.id, workspace_id: collaborator.workspace_id,
      action: 'UPDATE', entity: 'Collaborator', entity_id: collaborator.id,
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      payload: { name, email, external_id }
    });

    return NextResponse.json(collaborator);
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error updating collaborator' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const decoded = getAuthUser(request);
    const { id } = await params;
    const collaborator: any = await Collaborator.findByPk(id);
    if (!collaborator) return NextResponse.json({ error: 'Collaborator not found' }, { status: 404 });

    const workspace_id = collaborator.workspace_id;
    const collaborator_id = collaborator.id;
    const collaborator_name = collaborator.name;

    await collaborator.destroy();

    await logOperation({
      user_id: decoded.id, workspace_id,
      action: 'DELETE', entity: 'Collaborator', entity_id: collaborator_id,
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      payload: { name: collaborator_name }
    });

    return NextResponse.json({ message: 'Collaborator removed successfully' });
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error removing collaborator' }, { status: 500 });
  }
}
