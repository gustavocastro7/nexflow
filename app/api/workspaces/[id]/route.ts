import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/config/database';
import { verifyToken } from '@/lib/utils/jwt';
import Workspace from '@/lib/models/Workspace';

function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) throw new Error('Token not provided');
  const [, token] = authHeader.split(' ');
  return verifyToken(token) as { id: string; email: string; profile: string };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    getAuthUser(request);
    const { id } = await params;
    const workspace: any = await Workspace.findById(id);
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
    await connectDB();
    const decoded = getAuthUser(request);
    if (decoded.profile !== 'jedi') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id } = await params;
    const { name, status, billing_cycle_start_day, logo } = await request.json();

    const workspace: any = await Workspace.findById(id);
    if (!workspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });

    if (name !== undefined) workspace.name = name;
    if (status !== undefined) workspace.status = status;
    if (billing_cycle_start_day !== undefined) workspace.billing_cycle_start_day = billing_cycle_start_day;
    if (logo !== undefined) workspace.logo = logo;

    await workspace.save();
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
    await connectDB();
    const decoded = getAuthUser(request);
    if (decoded.profile !== 'jedi') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id } = await params;
    const workspace: any = await Workspace.findById(id);
    if (!workspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });

    await workspace.deleteOne();
    return NextResponse.json({ message: 'Workspace deleted successfully' });
  } catch (error: any) {
    if (error.message === 'Token not provided' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error deleting workspace' }, { status: 500 });
  }
}
