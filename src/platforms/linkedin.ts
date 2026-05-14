import { config } from "../config";
import type {
  PlatformAdapter,
  PublishInput,
  PublishResult,
} from "./types";

const LINKEDIN_API_VERSION = "202405";
const REST_BASE = "https://api.linkedin.com/rest";

function requireLinkedInConfig() {
  const { accessToken, authorUrn } = config.linkedin;
  if (!accessToken)
    throw new Error(
      "LINKEDIN_ACCESS_TOKEN not set — run `npm run oauth:linkedin`.",
    );
  if (!authorUrn)
    throw new Error(
      "LINKEDIN_AUTHOR_URN not set — run `npm run oauth:linkedin`.",
    );
  return { accessToken, authorUrn };
}

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "LinkedIn-Version": LINKEDIN_API_VERSION,
    "X-Restli-Protocol-Version": "2.0.0",
    "Content-Type": "application/json",
  };
}

async function initializeImageUpload(token: string, authorUrn: string) {
  const res = await fetch(`${REST_BASE}/images?action=initializeUpload`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({
      initializeUploadRequest: { owner: authorUrn },
    }),
  });
  if (!res.ok) {
    throw new Error(
      `LinkedIn image init failed: ${res.status} ${await res.text()}`,
    );
  }
  const json = (await res.json()) as {
    value: { uploadUrl: string; image: string };
  };
  return json.value;
}

async function uploadImageBinary(uploadUrl: string, token: string, buf: Buffer) {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: new Uint8Array(buf),
  });
  if (!res.ok) {
    throw new Error(
      `LinkedIn image upload failed: ${res.status} ${await res.text()}`,
    );
  }
}

async function uploadAllImages(
  token: string,
  authorUrn: string,
  images: PublishInput["media"],
): Promise<string[]> {
  const urns: string[] = [];
  for (const img of images) {
    const { uploadUrl, image } = await initializeImageUpload(token, authorUrn);
    await uploadImageBinary(uploadUrl, token, img.buffer);
    urns.push(image);
  }
  return urns;
}

function buildContent(imageUrns: string[]) {
  if (imageUrns.length === 0) return undefined;
  if (imageUrns.length === 1) return { media: { id: imageUrns[0] } };
  return {
    multiImage: {
      images: imageUrns.map((id) => ({ id, altText: "" })),
    },
  };
}

export const linkedin: PlatformAdapter = {
  name: "linkedin",
  async publish(input: PublishInput): Promise<PublishResult> {
    const { accessToken, authorUrn } = requireLinkedInConfig();

    const images = input.media.filter((m) =>
      m.contentType.startsWith("image/"),
    );
    const imageUrns = await uploadAllImages(accessToken, authorUrn, images);

    const body: Record<string, unknown> = {
      author: authorUrn,
      commentary: input.content,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    };
    const content = buildContent(imageUrns);
    if (content) body.content = content;

    const res = await fetch(`${REST_BASE}/posts`, {
      method: "POST",
      headers: headers(accessToken),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`LinkedIn post failed: ${res.status} ${text}`);
    }

    const postUrn =
      res.headers.get("x-restli-id") || res.headers.get("x-linkedin-id") || "";
    const url = postUrn
      ? `https://www.linkedin.com/feed/update/${postUrn}/`
      : "https://www.linkedin.com/feed/";
    return { url };
  },
};
