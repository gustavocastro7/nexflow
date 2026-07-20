import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/config/database';
import { verifyToken } from '@/lib/utils/jwt';
import Workspace from '@/lib/models/Workspace';
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
    const decoded = getAuthUser(request);
    if (decoded.profile !== 'jedi') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    const workspaces: any = await Workspace.find();
    return NextResponse.json(workspaces);
  } catch (error: any) {
    if (error.message === 'Token not provided' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error listing workspaces' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const decoded = getAuthUser(request);
    if (decoded.profile !== 'jedi') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { name, schema_name, billing_cycle_start_day, logo } = await request.json();
    if (!name || !schema_name) {
      return NextResponse.json({ error: 'name and schema_name are required' }, { status: 400 });
    }

    const workspace: any = await Workspace.create({
      name, schema_name,
      billing_cycle_start_day: billing_cycle_start_day || 1,
      logo: logo || null
    });

    await CostCenter.create({
      name: 'Matriz', code: 'MATRIZ',
      description: 'Centro de Custo Padrão',
      workspace_id: workspace.id, phones: []
    });

    return NextResponse.json(workspace, { status: 201 });
  } catch (error: any) {
    if (error.message === 'Token not provided' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error creating workspace' }, { status: 500 });
  }
}
