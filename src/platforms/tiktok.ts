import type {
  PlatformAdapter,
  PublishInput,
  PublishResult,
} from "./types";

// Content Posting API flow:
//   1. POST /v2/post/publish/video/init/ with post_info + source_info
//   2. PUT the binary in chunks to the returned upload_url
//   3. Poll /v2/post/publish/status/fetch/ until status=PUBLISH_COMPLETE
// Requires: app review with the content.publish scope and a working refresh
// token flow (TikTok access tokens expire in 24h).
export const tiktok: PlatformAdapter = {
  name: "tiktok",
  async publish(_input: PublishInput): Promise<PublishResult> {
    throw new Error("TikTok adapter not implemented yet.");
  },
};
