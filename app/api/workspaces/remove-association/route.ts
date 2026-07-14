import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import UserWorkspace from '@/lib/models/UserWorkspace';
import AssociationHistory from '@/lib/models/AssociationHistory';

function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) throw new Error('Token not provided');
  const [, token] = authHeader.split(' ');
  return jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key') as { id: string; email: string; profile: string };
}

export async function POST(request: NextRequest) {
  try {
    getAuthUser(request);
    const { userId, workspaceId } = await request.json();

    const association: any = await UserWorkspace.findOne({
      where: { user_id: userId, workspace_id: workspaceId }
    });
    if (!association) {
      return NextResponse.json({ error: 'Association not found' }, { status: 404 });
    }

    await association.destroy();
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
