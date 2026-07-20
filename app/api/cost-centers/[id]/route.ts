import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/config/database';
import { verifyToken } from '@/lib/utils/jwt';
import CostCenter from '@/lib/models/CostCenter';

function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) throw new Error('Token not provided');
  const [, token] = authHeader.split(' ');
  return verifyToken(token) as { id: string; email: string; profile: string };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    getAuthUser(request);
    const { id } = await params;
    const center: any = await CostCenter.findById(id);
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
    await connectDB();
    getAuthUser(request);
    const { id } = await params;
    const { name, description, phones } = await request.json();

    const center: any = await CostCenter.findById(id);
    if (!center) return NextResponse.json({ error: 'Cost center not found' }, { status: 404 });

    Object.assign(center, { name, description, phones: phones || [] });
    await center.save();
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
    await connectDB();
    getAuthUser(request);
    const { id } = await params;
    const center: any = await CostCenter.findById(id);
    if (!center) return NextResponse.json({ error: 'Cost center not found' }, { status: 404 });

    await center.deleteOne();
    return NextResponse.json({ message: 'Cost center removed successfully' });
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error removing cost center' }, { status: 500 });
  }
}
