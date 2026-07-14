import { NextRequest } from 'next/server';
import { GET as invoicesGet } from '../route';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  url.searchParams.set('operator', 'vivo');
  return invoicesGet(new NextRequest(url, request));
}
