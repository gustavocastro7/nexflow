import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get('workspaceId');
  const type = request.nextUrl.searchParams.get('type');

  if (!workspaceId || !type) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  return new NextResponse('Data;Value\nReportData;Placeholder', {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename=report_${type}.csv`,
    },
  });
}
