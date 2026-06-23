import { NextRequest } from 'next/server';

const BACKEND_URL =
  process.env.BACKEND_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:5000';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') ?? '';

  let upstream: Response;
  try {
    upstream = await fetch(`${BACKEND_URL}/api/geocode/search?q=${encodeURIComponent(q)}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Backend unreachable';
    return Response.json({ error: message }, { status: 502 });
  }

  const data = await upstream.json().catch(() => []);
  return Response.json(data, { status: upstream.status });
}
