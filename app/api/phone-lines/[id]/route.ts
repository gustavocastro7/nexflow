import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/config/database';
import { verifyToken } from '@/lib/utils/jwt';
import PhoneLine from '@/lib/models/PhoneLine';

function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) throw new Error('Token not provided');
  const [, token] = authHeader.split(' ');
  return verifyToken(token) as { id: string; email: string; profile: string };
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    getAuthUser(request);
    const { id } = await params;
    const { collaborator_id, cost_center_id, responsible_name, responsible_id } = await request.json();

    const line: any = await PhoneLine.findById(id);
    if (!line) return NextResponse.json({ error: 'Phone line not found' }, { status: 404 });

    Object.assign(line, {
      collaborator_id: collaborator_id || null,
      cost_center_id: cost_center_id || null,
      responsible_name, responsible_id
    });
    await line.save();

    return NextResponse.json(line);
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error updating phone line' }, { status: 500 });
  }
}
