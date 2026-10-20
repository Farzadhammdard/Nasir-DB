import { dispatchBusiness, publicApiError } from '@/lib/business';
import { withJsonStore } from '@/lib/json-store';

export const runtime = 'nodejs';

async function handle(request, context, method) {
  try {
    const { resource = [] } = await context.params;
    const body = ['POST', 'PUT', 'PATCH'].includes(method) ? await request.json().catch(() => ({})) : {};
    const result = await withJsonStore(() => dispatchBusiness(method, resource, request, body));
    if (resource.length === 1 && resource[0] === 'backup' && method === 'GET') {
      return new Response(JSON.stringify(result, null, 2), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': 'attachment; filename="companymanager-backup.json"',
        },
      });
    }
    return Response.json(result ?? null, { status: method === 'POST' ? 201 : 200 });
  } catch (error) {
    return publicApiError(error);
  }
}

export const GET = (request, context) => handle(request, context, 'GET');
export const POST = (request, context) => handle(request, context, 'POST');
export const PUT = (request, context) => handle(request, context, 'PUT');
export const PATCH = (request, context) => handle(request, context, 'PATCH');
export const DELETE = (request, context) => handle(request, context, 'DELETE');