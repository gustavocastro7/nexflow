import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import UserConfig from '@/lib/models/UserConfig';
import Workspace from '@/lib/models/Workspace';

function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) throw new Error('Token not provided');
  const [, token] = authHeader.split(' ');
  return jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key') as { id: string; email: string; profile: string };
}

export async function GET(request: NextRequest) {
  try {
    const decoded = getAuthUser(request);
    const config: any = await UserConfig.findOne({
      where: { user_id: decoded.id },
      include: [{ model: Workspace, as: 'lastWorkspace' }]
    });

    if (!config) {
      return NextResponse.json({ error: 'User configuration not found' }, { status: 404 });
    }

    return NextResponse.json({
      theme_mode: config.theme_mode,
      language: config.language,
      last_workspace_id: config.last_workspace_id,
      menu_behavior: config.menu_behavior,
      last_login: config.last_login,
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
    const decoded = getAuthUser(request);
    const { theme_mode, language, last_workspace_id, menu_behavior } = await request.json();

    let config: any = await UserConfig.findOne({ where: { user_id: decoded.id } });

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

    return NextResponse.json(config.toJSON());
  } catch (error: any) {
    if (error.name === 'SequelizeValidationError') {
      return NextResponse.json({ error: error.errors.map((e: any) => e.message).join(', ') }, { status: 400 });
    }
    if (error.message === 'Token not provided' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal Server Error while updating configuration' }, { status: 500 });
  }
}
