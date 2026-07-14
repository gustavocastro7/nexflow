import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import UserWorkspace from '@/lib/models/UserWorkspace';

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

    const existingAssociation: any = await UserWorkspace.findOne({ where: { user_id: userId } });
    if (existingAssociation) {
      return NextResponse.json({ error: 'User already associated with a workspace.' }, { status: 400 });
    }

    const association: any = await UserWorkspace.create({ user_id: userId, workspace_id: workspaceId });
    return NextResponse.json(association, { status: 201 });
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error creating unique association' }, { status: 500 });
  }
}
