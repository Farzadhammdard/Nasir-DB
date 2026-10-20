import { initializeSystem } from '@/actions/auth.actions';
export async function POST(req) {
  try {
    const form = await req.formData();
    const result = await initializeSystem(form);
    return Response.json(result, { status: 200 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}
