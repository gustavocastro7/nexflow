import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/config/database';
import User from '@/lib/models/User';
import { logOperation } from '@/lib/utils/auditLogger';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 });
    }

    const userExists: any = await User.findOne({ email });
    if (userExists) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    const user: any = await User.create({
      name,
      email,
      password_hash: password,
      profile: 'user',
    });

    await logOperation({
      user_id: user.id,
      workspace_id: user.default_workspace_id || null,
      action: 'REGISTER',
      entity: 'User',
      entity_id: user.id,
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      payload: { email: user.email, name: user.name }
    });

    return NextResponse.json({
      id: user.id, name: user.name, email: user.email, profile: user.profile,
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error registering user' }, { status: 500 });
  }
}
