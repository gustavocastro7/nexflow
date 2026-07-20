import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/config/database';
import { verifyToken } from '@/lib/utils/jwt';
import OperationLog from '@/lib/models/OperationLog';
import User from '@/lib/models/User';

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
    if (decoded.profile !== 'jedi') {
      return NextResponse.json({ error: 'Access denied. Jedi profile required.' }, { status: 403 });
    }

    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const action = searchParams.get('action');
    const entity = searchParams.get('entity');
    const user_id = searchParams.get('user_id');
    const workspace_id = searchParams.get('workspace_id');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const offset = (page - 1) * limit;
    const filter: Record<string, any> = {};

    if (action) filter.action = action;
    if (entity) filter.entity = entity;
    if (user_id) filter.user_id = user_id;
    if (workspace_id) filter.workspace_id = workspace_id;
    if (startDate || endDate) {
      filter.created_at = {};
      if (startDate) filter.created_at.$gte = new Date(startDate);
      if (endDate) filter.created_at.$lte = new Date(endDate);
    }

    const [count, logsRaw] = await Promise.all([
      OperationLog.countDocuments(filter),
      OperationLog.find(filter).sort({ created_at: -1 }).skip(offset).limit(limit),
    ]);

    const userIds = [...new Set(logsRaw.map((l: any) => l.user_id).filter(Boolean))];
    const users = await User.find({ _id: { $in: userIds } }).select('name email');
    const userMap = new Map(users.map((u: any) => [u.id, { name: u.name, email: u.email }]));

    const logs = logsRaw.map((l: any) => {
      const obj = l.toObject();
      obj.user = l.user_id ? userMap.get(l.user_id) || null : null;
      return obj;
    });

    return NextResponse.json({
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      logs
    });
  } catch (error: any) {
    if (error.message === 'Token not provided' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
