import type {
  PlatformAdapter,
  PublishInput,
  PublishResult,
} from "./types.js";

// YouTube Data API v3 resumable upload:
//   1. POST /upload/youtube/v3/videos?uploadType=resumable with snippet metadata
//      -> Location header is the upload URL
//   2. PUT the binary to the upload URL
// Costs 1600 quota units per upload (default daily quota 10000 = ~6/day).
// Requires Google OAuth 2.0 with the youtube.upload scope.
export const youtube: PlatformAdapter = {
  name: "youtube",
  async publish(_input: PublishInput): Promise<PublishResult> {
    throw new Error("YouTube adapter not implemented yet.");
  },
};
