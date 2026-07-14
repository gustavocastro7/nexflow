import { NextRequest, NextResponse } from 'next/server';
import AuthService from '@/lib/services/AuthService';
import { logOperation } from '@/lib/utils/auditLogger';
import User from '@/lib/models/User';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body || {};

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const { user, token } = await AuthService.authenticate(email, password);

    await logOperation({
      user_id: (user as any).id,
      workspace_id: (user as any).default_workspace_id || '00000000-0000-0000-0000-000000000000',
      action: 'LOGIN',
      entity: 'User',
      entity_id: (user as any).id,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      payload: { email: (user as any).email }
    });

    return NextResponse.json({
      user: {
        id: (user as any).id,
        name: (user as any).name,
        email: (user as any).email,
        profile: (user as any).profile,
        default_workspace_id: (user as any).default_workspace_id,
        config: (user as any).config,
      },
      token,
    });
  } catch (error: any) {
    try {
      const body = await request.clone().json();
      const email = body?.email;
      if (email) {
        const attemptedUser: any = await User.findOne({ where: { email } });
        if (attemptedUser) {
          await logOperation({
            user_id: attemptedUser.id,
            workspace_id: attemptedUser.default_workspace_id || '00000000-0000-0000-0000-000000000000',
            action: 'LOGIN_FAILED',
            entity: 'User',
            entity_id: attemptedUser.id,
            ip_address: request.headers.get('x-forwarded-for') || 'unknown',
            payload: { email, error: error.message }
          });
        }
      }
    } catch {}

    return NextResponse.json({ error: error.message || 'Internal Server Error during login' }, { status: 500 });
  }
}
