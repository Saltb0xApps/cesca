export const parseTags = (csv: string): string[] =>
  csv
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

export const serializeTags = (tags: string[]): string =>
  [...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean))].join(",");
