import { NextRequest, NextResponse } from "next/server";

const EA_ORIGIN = "https://proclubs.ea.com/api/fc";
const PROXY_SECRET = process.env.EA_PROXY_SECRET;

const EA_HEADERS: Record<string, string> = {
  authority: "proclubs.ea.com",
  accept: "application/json",
  "accept-language": "en-US,en;q=0.9",
  "sec-ch-ua": '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"macOS"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  referer: "https://proclubs.ea.com/",
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
};

export const runtime = "nodejs";
export const preferredRegion = "lhr1";

type RouteContext = { params: Promise<{ path: string[] }> };

async function proxyToEa(request: NextRequest, path: string[]) {
  if (PROXY_SECRET) {
    const key = request.headers.get("x-ea-proxy-key");
    if (key !== PROXY_SECRET) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }
  }

  const target = `${EA_ORIGIN}/${path.join("/")}${request.nextUrl.search}`;

  try {
    const res = await fetch(target, {
      headers: EA_HEADERS,
      cache: "no-store",
    });
    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: {
        "content-type": res.headers.get("content-type") || "application/json",
        "x-ea-proxy-region": "lhr1",
      },
    });
  } catch {
    return NextResponse.json({ detail: "EA proxy fetch failed" }, { status: 502 });
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyToEa(request, path);
}
