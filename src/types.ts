export type Platform =
  | "Instagram"
  | "TikTok"
  | "Twitter / X"
  | "YouTube"
  | "Facebook"
  | "Reddit"
  | "Other";

export const PLATFORMS: Platform[] = [
  "Instagram",
  "TikTok",
  "Twitter / X",
  "YouTube",
  "Facebook",
  "Reddit",
  "Other",
];

export interface Entry {
  id: string;
  platform: Platform;
  reason: string;
  minutes: number;
  startedAt: number;
  endedAt?: number;
  completed: boolean;
}

export type Phase = "closed" | "opening" | "form" | "timing" | "done";
