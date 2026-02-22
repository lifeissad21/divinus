import { ConvexHttpClient } from "convex/browser";

let cachedClient: ConvexHttpClient | null | undefined;

export function getConvexServerClient(): ConvexHttpClient | null {
  if (cachedClient !== undefined) {
    return cachedClient;
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;
  if (!convexUrl) {
    cachedClient = null;
    return cachedClient;
  }

  cachedClient = new ConvexHttpClient(convexUrl);
  return cachedClient;
}
