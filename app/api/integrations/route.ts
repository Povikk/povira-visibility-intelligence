import { integrationStatus } from '@/lib/providers';

export async function GET() {
  return Response.json(integrationStatus(), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
