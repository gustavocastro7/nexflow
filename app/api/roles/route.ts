import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import Role from '@/lib/models/Role';

function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) throw new Error('Token not provided');
  const [, token] = authHeader.split(' ');
  return jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key') as { id: string; email: string; profile: string };
}

export async function POST(request: NextRequest) {
  try {
    getAuthUser(request);
    const { name } = await request.json();
    if (!name) return NextResponse.json({ error: 'Role name is required' }, { status: 400 });

    const roleExists: any = await Role.findOne({ where: { name } });
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
