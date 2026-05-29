import { NextRequest } from 'next/server';

// BACKEND_API_URL uses HTTP so Node.js does not reject the self-signed dev cert.
// NEXT_PUBLIC_API_URL (HTTPS) is kept for browser-side calls only.
const BACKEND_URL =
  process.env.BACKEND_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:5000';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${BACKEND_URL}/api/chat/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Backend unreachable';
    return new Response(
      `data: {"type":"error","message":"${message.replace(/"/g, '\\"')}"}\n\ndata: {"type":"done"}\n\n`,
      {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      },
    );
  }

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => `HTTP ${upstream.status}`);
    return new Response(
      `data: {"type":"error","message":"Backend error ${upstream.status}: ${errText.replace(/"/g, '\\"').slice(0, 200)}"}\n\ndata: {"type":"done"}\n\n`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
      },
    );
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
