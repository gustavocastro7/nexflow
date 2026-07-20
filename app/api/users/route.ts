import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/config/database';
import { verifyToken } from '@/lib/utils/jwt';
import User from '@/lib/models/User';
import UserWorkspace from '@/lib/models/UserWorkspace';
import Workspace from '@/lib/models/Workspace';
import { logOperation } from '@/lib/utils/auditLogger';

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
    const workspaceId = request.nextUrl.searchParams.get('workspaceId');
    const includeInactive = request.nextUrl.searchParams.get('includeInactive');

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
    }

    const wsExists = await Workspace.findById(workspaceId);
    if (!wsExists) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });

    const associations: any[] = await UserWorkspace.find({ workspace_id: workspaceId });
    const userIds = associations.map((a) => a.user_id);

    const filter: Record<string, any> = { _id: { $in: userIds } };
    if (includeInactive !== 'true') filter.active = true;

    const users = await User.find(filter).select('name email profile active default_workspace_id');

    return NextResponse.json(users);
  } catch (error: any) {
    if (error.message === 'Token not provided' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error listing users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const decoded = getAuthUser(request);
    if (decoded.profile !== 'admin' && decoded.profile !== 'jedi') {
      return NextResponse.json({ error: 'Permission denied. Only admins can create users.' }, { status: 403 });
    }

    const { name, email, password, profile, workspaceId } = await request.json();

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
    }

    let user: any = await User.findOne({ email });
    let isNew = false;

    if (user) {
      const association: any = await UserWorkspace.findOne({ user_id: user.id, workspace_id: workspaceId });
      if (association) {
        return NextResponse.json({ error: 'User already associated with this workspace' }, { status: 400 });
      }
    } else {
      user = await User.create({
        name, email, password_hash: password,
        profile: profile || 'user', default_workspace_id: workspaceId
      });
      isNew = true;
    }

    await UserWorkspace.create({ user_id: user.id, workspace_id: workspaceId });

    await logOperation({
      user_id: decoded.id, workspace_id: workspaceId,
      action: isNew ? 'CREATE' : 'ASSOCIATE', entity: 'User',
      entity_id: user.id, ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      payload: { email: user.email, name: user.name, profile: user.profile }
    });

    return NextResponse.json({
      id: user.id, name: user.name, email: user.email,
      profile: user.profile, active: user.active
    }, { status: 201 });
  } catch (error: any) {
    if (error.message === 'Token not provided' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error creating user' }, { status: 500 });
  }
}
