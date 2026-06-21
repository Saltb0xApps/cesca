import type { Doc, DocSummary, Folder, VersionMeta } from "./types";

const base = "/api";

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export const api = {
  // folders
  listFolders: () => fetch(`${base}/folders`).then(j<Folder[]>),
  createFolder: (name: string) =>
    fetch(`${base}/folders`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    }).then(j<Folder>),
  renameFolder: (id: string, name: string) =>
    fetch(`${base}/folders/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    }).then(j<Folder>),
  deleteFolder: (id: string) =>
    fetch(`${base}/folders/${id}`, { method: "DELETE" }).then(j),

  // documents
  listDocs: () => fetch(`${base}/docs`).then(j<DocSummary[]>),
  createDoc: (title: string, folderId: string | null) =>
    fetch(`${base}/docs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, folderId }),
    }).then(j<Doc>),
  getDoc: (id: string) => fetch(`${base}/docs/${id}`).then(j<Doc>),
  saveDoc: (id: string, doc: Partial<Doc>) =>
    fetch(`${base}/docs/${id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(doc),
    }).then(j<Doc>),
  deleteDoc: (id: string) =>
    fetch(`${base}/docs/${id}`, { method: "DELETE" }).then(j),

  // versions
  listVersions: (id: string) =>
    fetch(`${base}/docs/${id}/versions`).then(j<VersionMeta[]>),
  saveVersion: (id: string, label: string) =>
    fetch(`${base}/docs/${id}/versions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label }),
    }).then(j<VersionMeta>),
  getVersion: (id: string, ts: string) =>
    fetch(`${base}/docs/${id}/versions/${ts}`).then(j<Doc>),
  restoreVersion: (id: string, ts: string) =>
    fetch(`${base}/docs/${id}/versions/${ts}/restore`, {
      method: "POST",
    }).then(j<Doc>),
};
