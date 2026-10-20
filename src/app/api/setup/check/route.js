import { checkInitialized } from '@/actions/auth.actions';
export async function GET() {
  return Response.json({ initialized: await checkInitialized() }, { status: 200 });
}
