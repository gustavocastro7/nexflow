import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import Workspace from '@/lib/models/Workspace';
import UserWorkspace from '@/lib/models/UserWorkspace';

function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) throw new Error('Token not provided');
  const [, token] = authHeader.split(' ');
  return jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key') as { id: string; email: string; profile: string };
}

export async function POST(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);
    const { userId, workspaceId } = await request.json();

    if (decoded.profile === 'jedi') {
      const workspace: any = await Workspace.findByPk(workspaceId);
      if (!workspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
      return NextResponse.json({ message: 'Workspace session started (Master)', workspace });
    }

    const association: any = await UserWorkspace.findOne({
      where: { user_id: userId, workspace_id: workspaceId },
      include: [{ model: Workspace, as: 'workspace' }]
    });
    if (!association) return NextResponse.json({ error: 'User not associated with this workspace' }, { status: 403 });
    return NextResponse.json({ message: 'Workspace session started', workspace: association.workspace });
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error managing workspace session' }, { status: 500 });
  }
}
