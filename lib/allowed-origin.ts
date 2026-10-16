/**
 * Browsers always send Origin on a cross-site POST, so this stops other
 * websites from calling our APIs from their pages. Requests with no Origin
 * (a native app, server-to-server) are allowed through to the rate limits.
 */
export function isAllowedOrigin(origin: string) {
  try {
    const { protocol, hostname } = new URL(origin);
    if (hostname === "lifeonpaper.app" || hostname === "www.lifeonpaper.app") return protocol === "https:";
    if (hostname === "localhost" || hostname === "127.0.0.1") return true;
    if (hostname.endsWith(".vercel.app") && hostname.startsWith("life-on-paper")) return protocol === "https:";
    const extra = (process.env.MEMORY_ENGINE_ALLOWED_ORIGINS ?? "").split(",").map((item) => item.trim()).filter(Boolean);
    return extra.includes(origin);
  } catch {
    return false;
  }
}
