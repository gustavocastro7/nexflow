import { NextRequest, NextResponse } from 'next/server';
import User from '@/lib/models/User';

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email');
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const user = await User.findOne({ where: { email } });
    return NextResponse.json({ exists: !!user });
  } catch (error) {
    return NextResponse.json({ error: 'Error checking user existence' }, { status: 500 });
  }
}
