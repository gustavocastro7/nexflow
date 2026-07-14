import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import Workspace from '@/lib/models/Workspace';

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
    const workspace: any = await Workspace.findByPk(id);
    if (!workspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    return NextResponse.json(workspace);
  } catch (error: any) {
    if (error.message === 'Token not provided' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error fetching workspace' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const decoded = getAuthUser(request);
    if (decoded.profile !== 'jedi') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id } = await params;
    const { name, status, billing_cycle_start_day, logo } = await request.json();

    const workspace: any = await Workspace.findByPk(id);
    if (!workspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });

    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (status !== undefined) updateData.status = status;
    if (billing_cycle_start_day !== undefined) updateData.billing_cycle_start_day = billing_cycle_start_day;
    if (logo !== undefined) updateData.logo = logo;

    await workspace.update(updateData);
    return NextResponse.json(workspace);
  } catch (error: any) {
    if (error.message === 'Token not provided' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error updating workspace' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const decoded = getAuthUser(request);
    if (decoded.profile !== 'jedi') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id } = await params;
    const workspace: any = await Workspace.findByPk(id);
    if (!workspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });

    await workspace.destroy();
    return NextResponse.json({ message: 'Workspace deleted successfully' });
  } catch (error: any) {
    if (error.message === 'Token not provided' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error deleting workspace' }, { status: 500 });
  }
}
