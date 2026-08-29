import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function resolveApiOrigin(): string {
  const raw = (
    process.env.SHELFWISE_API_ORIGIN ||
    process.env.API_ORIGIN ||
    "http://127.0.0.1:8331"
  )
    .trim()
    .replace(/\/$/, "");

  if (!raw) return "http://127.0.0.1:8331";
  if (/^https?:\/\//i.test(raw)) return raw;
  // host:port without scheme (e.g. local or private network)
  return `http://${raw}`;
}

async function proxy(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> }
) {
  const { path = [] } = await ctx.params;
  const origin = resolveApiOrigin();
  const targetPath = path.length ? `/${path.join("/")}` : "";
  const url = `${origin}${targetPath}${req.nextUrl.search}`;

  const headers = new Headers();
  const auth = req.headers.get("authorization");
  const contentType = req.headers.get("content-type");
  const accept = req.headers.get("accept");
  if (auth) headers.set("authorization", auth);
  if (contentType) headers.set("content-type", contentType);
  if (accept) headers.set("accept", accept);

  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: "manual",
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }

  try {
    const res = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(20_000),
    });
    const body = await res.arrayBuffer();
    const responseHeaders = new Headers();
    const resType = res.headers.get("content-type");
    if (resType) responseHeaders.set("content-type", resType);

    return new NextResponse(body, {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "proxy failed";
    console.error("[api-proxy]", { url, origin, message });
    const timedOut = /abort|timeout/i.test(message);
    return NextResponse.json(
      {
        detail: timedOut
          ? `API timed out at ${origin}. The backend may be sleeping or down — retry in ~30s, or check the shelfwise service logs.`
          : `API unreachable at ${origin}. (${message})`,
      },
      { status: 502 }
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
