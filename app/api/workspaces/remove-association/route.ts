import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/config/database';
import { verifyToken } from '@/lib/utils/jwt';
import UserWorkspace from '@/lib/models/UserWorkspace';
import AssociationHistory from '@/lib/models/AssociationHistory';

function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) throw new Error('Token not provided');
  const [, token] = authHeader.split(' ');
  return verifyToken(token) as { id: string; email: string; profile: string };
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    getAuthUser(request);
    const { userId, workspaceId } = await request.json();

    const association: any = await UserWorkspace.findOne({ user_id: userId, workspace_id: workspaceId });
    if (!association) {
      return NextResponse.json({ error: 'Association not found' }, { status: 404 });
    }

    await association.deleteOne();
    await AssociationHistory.create({
      user_id: userId, workspace_id: workspaceId, action: 'removido'
    });

    return NextResponse.json({ message: 'Association removed successfully' });
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error removing association' }, { status: 500 });
  }
}
