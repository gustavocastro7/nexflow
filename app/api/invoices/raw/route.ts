import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import RawInvoice from '@/lib/models/RawInvoice';

function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) throw new Error('Token not provided');
  const [, token] = authHeader.split(' ');
  return jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key') as { id: string; email: string; profile: string };
}

export async function GET(request: NextRequest) {
  try {
    getAuthUser(request);
    const workspaceId = request.nextUrl.searchParams.get('workspaceId');
    const dueDate = request.nextUrl.searchParams.get('dueDate');

    if (!workspaceId) return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });

    const where: Record<string, any> = { workspace_id: workspaceId };
    if (dueDate === 'NO_DATE') where.due_date = { [Op.is]: null };
    else if (dueDate) where.due_date = dueDate;

    const raws: any = await RawInvoice.findAll({
      where,
      attributes: ['id', 'operator', 'content', 'created_at', 'due_date'],
      order: [['due_date', 'DESC'], ['created_at', 'DESC']]
    });

    return NextResponse.json(raws);
  } catch (error: any) {
    if (error.message === 'Token not provided' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error listing imported invoices' }, { status: 500 });
  }
}
