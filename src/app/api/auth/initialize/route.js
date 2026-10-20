import { initializeSystem } from '@/actions/auth.actions';
export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const form = await req.formData();
    const result = await initializeSystem(form);
    return Response.json(result, { status: 200 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: e.status || 400 });
  }
}
