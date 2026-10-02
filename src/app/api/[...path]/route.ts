import { NextRequest, NextResponse } from "next/server";

const ACCESS_COOKIE = "polar_access";
const REFRESH_COOKIE = "polar_refresh";

function backendUrl(path: string[], search: string) {
  const configured = process.env.API_PROXY_TARGET || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
  const base = configured.replace(/\/+$/, "").replace(/\/api$/, "");
  return `${base}/api/${path.map(encodeURIComponent).join("/")}${search}`;
}

function cookieOptions(maxAge: number) {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge };
}

function setTokens(response: NextResponse, accessToken: string, refreshToken?: string, expiresIn = 1800) {
  response.cookies.set(ACCESS_COOKIE, accessToken, cookieOptions(Math.max(60, expiresIn)));
  if (refreshToken) response.cookies.set(REFRESH_COOKIE, refreshToken, cookieOptions(14 * 24 * 60 * 60));
}

function clearTokens(response: NextResponse) {
  response.cookies.set(ACCESS_COOKIE, "", cookieOptions(0));
  response.cookies.set(REFRESH_COOKIE, "", cookieOptions(0));
}

async function forward(request: NextRequest, path: string[], method: string) {
  const requestUrl = backendUrl(path, request.nextUrl.search);
  const isLogin = path.join("/") === "auth/login" && method === "POST";
  const isSession = path.join("/") === "auth/session" && method === "GET";
  const isLogout = path.join("/") === "auth/logout" && method === "POST";

  if (isLogout) {
    const response = NextResponse.json({ ok: true });
    clearTokens(response);
    return response;
  }

  const isMultipart = request.headers.get("content-type")?.includes("multipart/form-data");
  let body: BodyInit | null | undefined = undefined;
  
  if (method !== "GET" && method !== "HEAD") {
    if (isMultipart) {
      body = request.body;
    } else {
      body = await request.arrayBuffer();
    }
  }

  const send = async (url: string, token?: string, payload?: BodyInit | null) => {
    const headers = new Headers();
    const contentType = request.headers.get("content-type");
    if (contentType) headers.set("content-type", contentType);
    const accept = request.headers.get("accept");
    if (accept) headers.set("accept", accept);
    const range = request.headers.get("range");
    if (range) headers.set("range", range);
    const ifRange = request.headers.get("if-range");
    if (ifRange) headers.set("if-range", ifRange);
    if (token) headers.set("authorization", `Bearer ${token}`);
    
    // In Node 18+, fetch with ReadableStream requires duplex: "half"
    const options: RequestInit & { duplex?: string } = { method, headers, body: payload, cache: "no-store", redirect: "manual" };
    if (payload && typeof (payload as any).getReader === 'function') {
      options.duplex = "half";
    }
    return fetch(url, options);
  };

  let accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  let upstream = await send(isSession ? backendUrl(["auth", "me"], "") : requestUrl, accessToken, body);
  let rotated: { access_token: string; refresh_token?: string; expires_in?: number } | undefined;

  if (upstream.status === 401 && !isLogin && !isMultipart) {
    const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
    if (refreshToken) {
      try {
        const refreshResponse = await fetch(backendUrl(["auth", "refresh"], ""), {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }), cache: "no-store",
        });
        if (refreshResponse.ok) {
          rotated = await refreshResponse.json();
          accessToken = rotated?.access_token;
          if (accessToken) upstream = await send(isSession ? backendUrl(["auth", "me"], "") : requestUrl, accessToken, body);
        }
      } catch {
        // Return the original unauthorized response if refresh is unavailable.
      }
    }
  }

  if (isLogin && upstream.ok) {
    const payload = await upstream.json();
    const response = NextResponse.json({ user: payload.user }, { status: upstream.status });
    setTokens(response, payload.access_token, payload.refresh_token, payload.expires_in);
    response.headers.set("cache-control", "no-store");
    return response;
  }

  const response = new NextResponse(upstream.body, { status: upstream.status });
  for (const header of ["content-type", "content-length", "content-range", "accept-ranges", "content-disposition", "etag", "last-modified"]) {
    const value = upstream.headers.get(header);
    if (value) response.headers.set(header, value);
  }
  response.headers.set("cache-control", upstream.headers.get("cache-control") || "no-store");
  if (rotated?.access_token) setTokens(response, rotated.access_token, rotated.refresh_token, rotated.expires_in);
  if (upstream.status === 401 && !request.cookies.get(REFRESH_COOKIE)?.value) clearTokens(response);
  return response;
}

type RouteContext = { params: Promise<{ path: string[] }> };

async function handle(request: NextRequest, context: RouteContext) {
  return forward(request, (await context.params).path, request.method);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const HEAD = handle;
