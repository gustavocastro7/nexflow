import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/config/database';
import { verifyToken } from '@/lib/utils/jwt';
import Role from '@/lib/models/Role';

function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) throw new Error('Token not provided');
  const [, token] = authHeader.split(' ');
  return verifyToken(token) as { id: string; email: string; profile: string };
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    getAuthUser(request);
    const { name } = await request.json();
    if (!name) return NextResponse.json({ error: 'Role name is required' }, { status: 400 });

    const roleExists: any = await Role.findOne({ name });
    if (roleExists) return NextResponse.json({ error: 'Role already exists' }, { status: 400 });

    const role: any = await Role.create({ name });
    return NextResponse.json(role, { status: 201 });
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error creating role' }, { status: 500 });
  }
}
