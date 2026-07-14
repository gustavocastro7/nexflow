import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import UserWorkspace from '@/lib/models/UserWorkspace';
import Workspace from '@/lib/models/Workspace';

function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) throw new Error('Token not provided');
  const [, token] = authHeader.split(' ');
  return jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key') as { id: string; email: string; profile: string };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    getAuthUser(request);
    const { userId } = await params;

    const associations: any[] = await UserWorkspace.findAll({
      where: { user_id: userId },
      include: [{
        model: Workspace, as: 'workspace'
      }]
    });

    const workspaces = associations
      .map(a => a.workspace)
      .filter(Boolean);

    return NextResponse.json(workspaces);
  } catch (error: any) {
    if (error.message === 'Token not provided' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error listing user workspaces' }, { status: 500 });
  }
}
