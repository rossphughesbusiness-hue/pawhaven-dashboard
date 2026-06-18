import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req) {
  const { password } = await req.json();
  if (password === process.env.DASHBOARD_PASSWORD) {
    const cookieStore = cookies();
    cookieStore.set('dash_auth', process.env.DASHBOARD_PASSWORD, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function DELETE() {
  const cookieStore = cookies();
  cookieStore.delete('dash_auth');
  return NextResponse.json({ ok: true });
}
