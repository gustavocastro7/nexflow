import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import OperationLog from '@/lib/models/OperationLog';
import User from '@/lib/models/User';

function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) throw new Error('Token not provided');
  const [, token] = authHeader.split(' ');
  return jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key') as { id: string; email: string; profile: string };
}

export async function GET(request: NextRequest) {
  try {
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
    const where: Record<string, any> = {};

    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (user_id) where.user_id = user_id;
    if (workspace_id) where.workspace_id = workspace_id;
    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at[Op.gte] = new Date(startDate);
      if (endDate) where.created_at[Op.lte] = new Date(endDate);
    }

    const { count, rows: logs }: { count: number; rows: any[] } = await (OperationLog as any).findAndCountAll({
      where,
      limit, offset,
      order: [['created_at', 'DESC']],
      include: [{ model: User, as: 'user', attributes: ['name', 'email'] }]
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
