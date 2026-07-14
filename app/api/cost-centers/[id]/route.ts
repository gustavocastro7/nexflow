import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import CostCenter from '@/lib/models/CostCenter';

function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) throw new Error('Token not provided');
  const [, token] = authHeader.split(' ');
  return jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key') as { id: string; email: string; profile: string };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    getAuthUser(request);
    const { id } = await params;
    const center: any = await CostCenter.findByPk(id);
    if (!center) return NextResponse.json({ error: 'Cost center not found' }, { status: 404 });
    return NextResponse.json(center);
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error fetching cost center' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    getAuthUser(request);
    const { id } = await params;
    const { name, description, phones } = await request.json();

    const center: any = await CostCenter.findByPk(id);
    if (!center) return NextResponse.json({ error: 'Cost center not found' }, { status: 404 });

    await center.update({ name, description, phones: phones || [] });
    return NextResponse.json(center);
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error updating cost center' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    getAuthUser(request);
    const { id } = await params;
    const center: any = await CostCenter.findByPk(id);
    if (!center) return NextResponse.json({ error: 'Cost center not found' }, { status: 404 });

    await center.destroy();
    return NextResponse.json({ message: 'Cost center removed successfully' });
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error removing cost center' }, { status: 500 });
  }
}
