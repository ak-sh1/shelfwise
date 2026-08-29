import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function resolveApiOrigin(): string {
  const raw =
    process.env.SHELFWISE_API_ORIGIN?.replace(/\/$/, "") ||
    "http://127.0.0.1:8331";
  return /^https?:\/\//.test(raw) ? raw : `http://${raw}`;
}

async function proxy(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> }
) {
  const { path = [] } = await ctx.params;
  const origin = resolveApiOrigin();
  const targetPath = path.length ? `/${path.join("/")}` : "";
  const url = `${origin}${targetPath}${req.nextUrl.search}`;

  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("connection");

  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: "manual",
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }

  const res = await fetch(url, init);
  const responseHeaders = new Headers(res.headers);
  responseHeaders.delete("content-encoding");

  return new NextResponse(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
