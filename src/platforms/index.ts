import type { Platform } from "../notion/schema";
import { instagram } from "./instagram";
import { linkedin } from "./linkedin";
import { substack } from "./substack";
import { tiktok } from "./tiktok";
import type { PlatformAdapter } from "./types";
import { youtube } from "./youtube";

export const adapters: Record<Platform, PlatformAdapter> = {
  linkedin,
  instagram,
  tiktok,
  youtube,
  substack,
};
