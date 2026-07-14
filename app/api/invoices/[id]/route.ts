import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import RawInvoice from '@/lib/models/RawInvoice';
import Invoice from '@/lib/models/Invoice';
import { logOperation } from '@/lib/utils/auditLogger';

function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) throw new Error('Token not provided');
  const [, token] = authHeader.split(' ');
  return jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key') as { id: string; email: string; profile: string };
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const decoded = getAuthUser(request);
    const { id } = await params;
    const workspaceId = request.nextUrl.searchParams.get('workspaceId');

    if (!workspaceId) return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });

    const rawInvoice: any = await RawInvoice.findOne({ where: { id, workspace_id: workspaceId } });
    if (!rawInvoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    const operator = rawInvoice.operator;
    const dueDate = rawInvoice.due_date;

    await Invoice.destroy({ where: { raw_invoice_id: id, workspace_id: workspaceId } });
    await rawInvoice.destroy();

    await logOperation({
      user_id: decoded.id, workspace_id: workspaceId,
      action: 'DELETE', entity: 'RawInvoice', entity_id: id,
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      payload: { operator, due_date: dueDate }
    });

    return NextResponse.json({ message: 'Invoice and items removed successfully' });
  } catch (error: any) {
    if (error.message === 'Token not provided' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error removing invoice' }, { status: 500 });
  }
}
