import { logout } from '@/actions/auth.actions';
export const runtime = 'nodejs';

export async function POST() {
  try {
    const result = await logout();
    return Response.json(result, { status: 200 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: e.status || 400 });
  }
}
