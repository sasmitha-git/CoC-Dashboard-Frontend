import { NextResponse } from 'next/server';

function buildGatewayUrl(pathSegments, requestUrl) {
  const gatewayBase =
    process.env.GATEWAY_URL || process.env.NEXT_PUBLIC_GATEWAY_URL;
  if (!gatewayBase) {
    throw new Error('Missing GATEWAY_URL environment variable.');
  }
  const encodedPath = pathSegments
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  const upstreamUrl = new URL(
    `${gatewayBase.replace(/\/+$/, '')}/${encodedPath}`
  );
  const incomingUrl = new URL(requestUrl);
  upstreamUrl.search = incomingUrl.search;
  return upstreamUrl;
}

async function proxyRequest(request, { params }) {
  try {
    const resolvedParams = await params;
    const upstreamUrl = buildGatewayUrl(resolvedParams?.path || [], request.url);

    // TEMP DEBUG
    console.log('Proxying to:', upstreamUrl.toString());
    console.log('Path segments:', resolvedParams?.path);

    const headers = new Headers(request.headers);
    headers.delete('host');

    // ─── WSO2 APIM mode (uncomment when testing with WSO2 locally) ───
    // const apimToken = process.env.APIM_TOKEN || process.env.NEXT_PUBLIC_APIM_TOKEN;
    // if (!apimToken) {
    //   return NextResponse.json(
    //     { message: 'Missing APIM_TOKEN environment variable.' },
    //     { status: 500 }
    //   );
    // }
    // headers.set('Authorization', `Bearer ${apimToken}`);
    // ─────────────────────────────────────────────────────────────────

    // ─── Production mode (Railway — no WSO2, token optional) ─────────
    const apimToken = process.env.APIM_TOKEN || process.env.NEXT_PUBLIC_APIM_TOKEN;
    if (apimToken) {
      headers.set('Authorization', `Bearer ${apimToken}`);
    }
    // ─────────────────────────────────────────────────────────────────

    const init = {
      method: request.method,
      headers,
      cache: 'no-store',
    };

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      init.body = await request.text();
    }

    const upstreamResponse = await fetch(upstreamUrl, init);

    const responseHeaders = new Headers(upstreamResponse.headers);
    responseHeaders.delete('content-encoding');
    responseHeaders.delete('content-length');

    return new NextResponse(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error('Gateway proxy error:', error);
    return NextResponse.json(
      { message: 'Failed to reach upstream gateway.' },
      { status: 502 }
    );
  }
}

export const dynamic = 'force-dynamic';

export async function GET(request, context) {
  return proxyRequest(request, context);
}

export async function POST(request, context) {
  return proxyRequest(request, context);
}

export async function PUT(request, context) {
  return proxyRequest(request, context);
}

export async function PATCH(request, context) {
  return proxyRequest(request, context);
}

export async function DELETE(request, context) {
  return proxyRequest(request, context);
}