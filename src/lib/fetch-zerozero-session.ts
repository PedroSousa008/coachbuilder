/**
 * ZeroZero often returns 403 to bare server-side fetch (Vercel IPs, bot filters).
 * Warm the origin with a homepage GET, forward Set-Cookie, and send browser-like headers.
 */

const CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const ORIGIN = "https://www.zerozero.pt";

function baseHeaders(): Record<string, string> {
  return {
    "User-Agent": CHROME_UA,
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "pt-PT,pt;q=0.9,en-GB;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "Cache-Control": "max-age=0",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-User": "?1",
  };
}

function cookiesFromResponse(res: Response): string {
  const h = res.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof h.getSetCookie === "function") {
    const list = h.getSetCookie();
    if (list?.length) {
      return list
        .map((c) => c.split(";")[0]?.trim())
        .filter(Boolean)
        .join("; ");
    }
  }
  const single = res.headers.get("set-cookie");
  if (single) return single.split(";")[0] ?? "";
  return "";
}

export type ZeroZeroFetch = (input: string | URL, init?: RequestInit) => Promise<Response>;

/**
 * Single GET (no cookie warm). Keeps Hobby serverless runs under ~10s — the warm + fetch path was too slow.
 * On 403/429 the route can retry with `createZeroZeroFetchSession`.
 */
export async function fetchZeroZeroPageOnce(url: string): Promise<Response> {
  const signal =
    typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
      ? AbortSignal.timeout(6000)
      : undefined;
  return fetch(url, {
    method: "GET",
    redirect: "follow",
    cache: "no-store",
    signal,
    headers: {
      ...baseHeaders(),
      "Sec-Fetch-Site": "none",
      Referer: `${ORIGIN}/`,
    },
  });
}

/**
 * One session = one cookie jar. Call `warm()` then use `fetch` for all ZeroZero URLs in that request.
 */
export async function createZeroZeroFetchSession(): Promise<{ fetch: ZeroZeroFetch; cookie: string }> {
  const origin = ORIGIN;

  let cookie = "";
  try {
    const warm = await fetch(`${origin}/`, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      signal:
        typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
          ? AbortSignal.timeout(3000)
          : undefined,
      headers: {
        ...baseHeaders(),
        "Sec-Fetch-Site": "none",
        Referer: origin + "/",
      },
    });
    cookie = cookiesFromResponse(warm);
    await warm.body?.cancel().catch(() => {});
  } catch {
    /* continue without cookies */
  }

  const fetchZ: ZeroZeroFetch = (input, init = {}) => {
    const url = typeof input === "string" ? input : input.toString();
    let referer = origin + "/";
    try {
      const u = new URL(url);
      if (u.origin === origin) referer = origin + "/";
    } catch {
      /* keep default */
    }
    const nextHeaders = new Headers(init.headers);
    const merged: Record<string, string> = {
      ...baseHeaders(),
      "Sec-Fetch-Site": "same-origin",
      Referer: referer,
      ...(cookie ? { Cookie: cookie } : {}),
    };
    for (const [k, v] of Object.entries(merged)) {
      if (!nextHeaders.has(k)) nextHeaders.set(k, v);
    }
    return fetch(input, {
      ...init,
      redirect: "follow",
      cache: "no-store",
      headers: nextHeaders,
    });
  };

  return { fetch: fetchZ, cookie };
}
