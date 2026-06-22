export type BlockType = "p" | "h" | "quote" | "list";

export interface Block {
  id: string;
  type: BlockType;
  text: string;
}

export type HighlightColor = "light" | "mid" | "invert";

export interface Highlight {
  id: string;
  blockId: string;
  start: number; // character offset within the block's plain text
  end: number;
  color: HighlightColor;
}

export interface MarginNote {
  id: string;
  blockId: string;
  anchorStart?: number;
  anchorEnd?: number;
  text: string;
  side: "left" | "right";
}

// A free "move / see-here" arrow drawn between two blocks (intent markup).
export interface MoveArrow {
  id: string;
  fromBlockId: string;
  toBlockId: string;
  label?: string;
}

export interface Annotations {
  highlights: Highlight[];
  notes: MarginNote[];
  arrows: MoveArrow[];
}

export interface Doc {
  id: string;
  title: string;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
  blocks: Block[];
  annotations: Annotations;
}

export interface DocSummary {
  id: string;
  title: string;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
  excerpt: string;
  wordCount: number;
  annotationCount: number;
}

export interface Folder {
  id: string;
  name: string;
  createdAt: string;
}

export interface VersionMeta {
  ts: string;
  savedAt: string;
  label: string;
  wordCount: number;
}
