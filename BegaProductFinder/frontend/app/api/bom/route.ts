import { NextRequest } from 'next/server';

// Uses BACKEND_API_URL (HTTP) to avoid self-signed certificate rejection in dev.
// The browser calls /api/bom (relative) → Next.js server → backend HTTP.
const BACKEND_URL =
  process.env.BACKEND_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:5000';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${BACKEND_URL}/api/bom/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Backend unreachable';
    return Response.json({ error: message }, { status: 502 });
  }

  const data = await upstream.json().catch(() => ({ error: `HTTP ${upstream.status}` }));
  return Response.json(data, { status: upstream.status });
}
