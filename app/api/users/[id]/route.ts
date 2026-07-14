import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import User from '@/lib/models/User';
import UserConfig from '@/lib/models/UserConfig';
import { logOperation } from '@/lib/utils/auditLogger';

function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) throw new Error('Token not provided');
  const [, token] = authHeader.split(' ');
  return jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key') as { id: string; email: string; profile: string };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    getAuthUser(request);
    const { id } = await params;
    const user: any = await User.findByPk(id, {
      include: [{ model: UserConfig, as: 'config' }]
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({
      id: user.id, name: user.name, email: user.email,
      profile: user.profile, active: user.active,
      default_workspace_id: user.default_workspace_id, config: user.config
    });
  } catch (error: any) {
    if (error.message === 'Token not provided' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error fetching user' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const decoded = getAuthUser(request);
    const { id } = await params;

    if (decoded.profile !== 'admin' && decoded.profile !== 'jedi' && decoded.id !== id) {
      return NextResponse.json({ error: 'Permission denied.' }, { status: 403 });
    }

    const { name, email, profile, default_workspace_id, active } = await request.json();

    const user: any = await User.findByPk(id);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const updatedData: Record<string, any> = { name, email, default_workspace_id };
    if (decoded.profile === 'admin' || decoded.profile === 'jedi') {
      if (profile) updatedData.profile = profile;
      if (active !== undefined) updatedData.active = active;
    }

    await user.update(updatedData);

    await logOperation({
      user_id: decoded.id, workspace_id: user.default_workspace_id || '00000000-0000-0000-0000-000000000000',
      action: 'UPDATE', entity: 'User', entity_id: user.id,
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      payload: { updatedFields: Object.keys(updatedData) }
    });

    return NextResponse.json({
      id: user.id, name: user.name, email: user.email,
      profile: user.profile, default_workspace_id: user.default_workspace_id, active: user.active,
    });
  } catch (error: any) {
    if (error.message === 'Token not provided' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error updating user' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const decoded = getAuthUser(request);
    if (decoded.profile !== 'admin' && decoded.profile !== 'jedi') {
      return NextResponse.json({ error: 'Permission denied.' }, { status: 403 });
    }

    const { id } = await params;
    const user: any = await User.findByPk(id);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    await user.update({ active: false });

    await logOperation({
      user_id: decoded.id, workspace_id: user.default_workspace_id || '00000000-0000-0000-0000-000000000000',
      action: 'DEACTIVATE', entity: 'User', entity_id: user.id,
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      payload: {}
    });

    return NextResponse.json({ message: 'User deactivated successfully' });
  } catch (error: any) {
    if (error.message === 'Token not provided' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error deactivating user' }, { status: 500 });
  }
}
