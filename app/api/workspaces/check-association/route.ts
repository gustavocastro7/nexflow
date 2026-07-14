import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import UserWorkspace from '@/lib/models/UserWorkspace';

function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) throw new Error('Token not provided');
  const [, token] = authHeader.split(' ');
  return jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key') as { id: string; email: string; profile: string };
}

export async function GET(request: NextRequest) {
  try {
    getAuthUser(request);
    const userId = request.nextUrl.searchParams.get('userId');
    const workspaceId = request.nextUrl.searchParams.get('workspaceId');

    const association: any = await UserWorkspace.findOne({
      where: { user_id: userId, workspace_id: workspaceId }
    });

    return NextResponse.json({ associated: !!association });
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error verifying association' }, { status: 500 });
  }
}
