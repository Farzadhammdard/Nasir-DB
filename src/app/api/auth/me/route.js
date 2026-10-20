import { getMe } from '@/actions/auth.actions';
export const runtime = 'nodejs';

export async function GET() {
  const user = await getMe();
  if (!user) return Response.json({ user: null }, { status: 200 });
  const { sessionToken, ...rest } = user;
  return Response.json({ user: rest }, { status: 200 });
}
