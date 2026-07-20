import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/config/database';
import { verifyToken } from '@/lib/utils/jwt';
import UserConfig from '@/lib/models/UserConfig';

function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) throw new Error('Token not provided');
  const [, token] = authHeader.split(' ');
  return verifyToken(token) as { id: string; email: string; profile: string };
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const decoded = getAuthUser(request);
    const { id } = await params;

    if (decoded.id !== id && decoded.profile !== 'jedi') {
      return NextResponse.json({ error: 'Permission denied.' }, { status: 403 });
    }

    const { last_workspace_id, theme_mode, language } = await request.json();

    let config: any = await UserConfig.findOne({ user_id: id });
    if (!config) {
      config = await UserConfig.create({ user_id: id, last_workspace_id, theme_mode, language });
    } else {
      Object.assign(config, { last_workspace_id, theme_mode, language });
      await config.save();
    }

    return NextResponse.json(config);
  } catch (error: any) {
    if (error.message === 'Token not provided' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error updating configuration' }, { status: 500 });
  }
}
