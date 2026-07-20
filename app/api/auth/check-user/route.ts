import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/config/database';
import User from '@/lib/models/User';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const email = request.nextUrl.searchParams.get('email');
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const user = await User.findOne({ email });
    return NextResponse.json({ exists: !!user });
  } catch (error) {
    return NextResponse.json({ error: 'Error checking user existence' }, { status: 500 });
  }
}
