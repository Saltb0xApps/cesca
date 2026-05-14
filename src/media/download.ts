export interface DownloadedMedia {
  name: string;
  buffer: Buffer;
  contentType: string;
}

export async function downloadMedia(
  url: string,
  name: string,
): Promise<DownloadedMedia> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download media ${name}: ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const contentType =
    res.headers.get("content-type") || "application/octet-stream";
  return { name, buffer: buf, contentType };
}
