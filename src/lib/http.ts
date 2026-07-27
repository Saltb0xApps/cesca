/** Small fetch helper with a timeout — RN's fetch has none by default. */

export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch {
    if (controller.signal.aborted) {
      throw new Error('Request timed out — check your connection and retry.');
    }
    throw new Error('Network request failed — are you online?');
  } finally {
    clearTimeout(timer);
  }
}
