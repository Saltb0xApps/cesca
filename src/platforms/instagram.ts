import type {
  PlatformAdapter,
  PublishInput,
  PublishResult,
} from "./types.js";

// Two-step flow once implemented:
//   1. POST /{ig-user-id}/media with image_url|video_url + caption -> creation_id
//   2. POST /{ig-user-id}/media_publish with creation_id
// Requires: IG Business/Creator account linked to a FB Page, Meta app reviewed
// for instagram_content_publish, and a long-lived Page access token. Notion's
// signed file URLs expire after ~1h, so we'll need to re-host media on a public
// URL (S3/R2) before calling the API.
export const instagram: PlatformAdapter = {
  name: "instagram",
  async publish(_input: PublishInput): Promise<PublishResult> {
    throw new Error("Instagram adapter not implemented yet.");
  },
};
