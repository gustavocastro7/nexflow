import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/config/database';
import { verifyToken } from '@/lib/utils/jwt';
import UserWorkspace from '@/lib/models/UserWorkspace';
import Workspace from '@/lib/models/Workspace';

function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) throw new Error('Token not provided');
  const [, token] = authHeader.split(' ');
  return verifyToken(token) as { id: string; email: string; profile: string };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    await connectDB();
    getAuthUser(request);
    const { userId } = await params;

    const associations: any[] = await UserWorkspace.find({ user_id: userId });
    const workspaceIds = associations.map((a) => a.workspace_id);
    const workspaces = await Workspace.find({ _id: { $in: workspaceIds } });

    return NextResponse.json(workspaces);
  } catch (error: any) {
    if (error.message === 'Token not provided' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error listing user workspaces' }, { status: 500 });
  }
}
