import type { Platform } from "../notion/schema.js";
import { instagram } from "./instagram.js";
import { linkedin } from "./linkedin.js";
import { substack } from "./substack.js";
import { tiktok } from "./tiktok.js";
import type { PlatformAdapter } from "./types.js";
import { youtube } from "./youtube.js";

export const adapters: Record<Platform, PlatformAdapter> = {
  linkedin,
  instagram,
  tiktok,
  youtube,
  substack,
};
