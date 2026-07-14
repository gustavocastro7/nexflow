import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import OperationLog from '@/lib/models/OperationLog';

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

    const entities: any[] = await (OperationLog as any).findAll({
      attributes: [[(OperationLog as any).sequelize.fn('DISTINCT', (OperationLog as any).sequelize.col('entity')), 'entity']],
    });
    return NextResponse.json(entities.map(e => e.entity).filter(Boolean));
  } catch (error: any) {
    if (error.message === 'Token not provided' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch entity types' }, { status: 500 });
  }
}
