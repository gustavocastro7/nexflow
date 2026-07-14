import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import User from '@/lib/models/User';
import UserConfig from '@/lib/models/UserConfig';
import UserWorkspace from '@/lib/models/UserWorkspace';
import Workspace from '@/lib/models/Workspace';
import { logOperation } from '@/lib/utils/auditLogger';

function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) throw new Error('Token not provided');
  const [, token] = authHeader.split(' ');
  return jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key') as { id: string; email: string; profile: string };
}

export async function GET(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);
    const workspaceId = request.nextUrl.searchParams.get('workspaceId');
    const includeInactive = request.nextUrl.searchParams.get('includeInactive');

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
    }

    const whereClause: Record<string, any> = {};
    if (includeInactive !== 'true') whereClause.active = true;

    const workspace: any = await Workspace.findByPk(workspaceId, {
      include: [{
        model: User, as: 'users', where: whereClause,
        through: { attributes: [] },
        attributes: ['id', 'name', 'email', 'profile', 'active', 'default_workspace_id']
      }]
    });

    if (!workspace) {
      const wsExists = await Workspace.findByPk(workspaceId);
      if (!wsExists) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
      return NextResponse.json([]);
    }

    return NextResponse.json(workspace.users || []);
  } catch (error: any) {
    if (error.message === 'Token not provided' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error listing users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);
    if (decoded.profile !== 'admin' && decoded.profile !== 'jedi') {
      return NextResponse.json({ error: 'Permission denied. Only admins can create users.' }, { status: 403 });
    }

    const { name, email, password, profile, workspaceId } = await request.json();

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
    }

    let user: any = await User.findOne({ where: { email } });
    let isNew = false;

    if (user) {
      const association: any = await UserWorkspace.findOne({
        where: { user_id: user.id, workspace_id: workspaceId }
      });
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
