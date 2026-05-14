import { config } from "../config.js";
import type {
  PlatformAdapter,
  PublishInput,
  PublishResult,
} from "./types.js";

export const substack: PlatformAdapter = {
  name: "substack",
  async publish(_input: PublishInput): Promise<PublishResult> {
    const pub = config.substack.publication;
    if (!pub) {
      throw new Error(
        "SUBSTACK_PUBLICATION not set. Substack has no posting API; we just return a draft link.",
      );
    }
    return {
      url: `https://${pub}.substack.com/publish/post?type=newsletter`,
    };
  },
};
