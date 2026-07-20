import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/config/database';
import { verifyToken } from '@/lib/utils/jwt';
import UserConfig from '@/lib/models/UserConfig';
import Workspace from '@/lib/models/Workspace';

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
    const config: any = await UserConfig.findOne({ user_id: decoded.id });

    if (!config) {
      return NextResponse.json({ error: 'User configuration not found' }, { status: 404 });
    }

    const lastWorkspace = config.last_workspace_id ? await Workspace.findById(config.last_workspace_id) : null;

    return NextResponse.json({
      theme_mode: config.theme_mode,
      language: config.language,
      last_workspace_id: config.last_workspace_id,
      menu_behavior: config.menu_behavior,
      last_login: config.last_login,
      lastWorkspace,
    });
  } catch (error: any) {
    if (error.message === 'Token not provided' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal Server Error while fetching configuration' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const decoded = getAuthUser(request);
    const { theme_mode, language, last_workspace_id, menu_behavior } = await request.json();

    let config: any = await UserConfig.findOne({ user_id: decoded.id });

    if (!config) {
      config = await UserConfig.create({
        user_id: decoded.id,
        theme_mode, language, last_workspace_id, menu_behavior,
      });
    } else {
      if (theme_mode !== undefined) config.theme_mode = theme_mode;
      if (language !== undefined) config.language = language;
      if (last_workspace_id !== undefined) config.last_workspace_id = last_workspace_id;
      if (menu_behavior !== undefined) config.menu_behavior = menu_behavior;
      await config.save();
    }

    return NextResponse.json(config.toObject());
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error.message === 'Token not provided' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal Server Error while updating configuration' }, { status: 500 });
  }
}
