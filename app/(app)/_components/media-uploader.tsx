"use client";

import { useCallback, useRef, useState } from "react";

export interface UploadedMedia {
  fileUploadId: string;
  name: string;
  previewUrl: string;
}

interface Props {
  onChange: (files: UploadedMedia[]) => void;
  files: UploadedMedia[];
}

export default function MediaUploader({ files, onChange }: Props) {
  const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(
    async (file: File): Promise<UploadedMedia | null> => {
      const form = new FormData();
      form.append("file", file, file.name);
      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Upload failed: ${res.status}`);
      }
      const json = (await res.json()) as { id: string; name: string };
      return {
        fileUploadId: json.id,
        name: json.name,
        previewUrl: URL.createObjectURL(file),
      };
    },
    [],
  );

  const handleFiles = useCallback(
    async (list: FileList | File[]) => {
      const arr = Array.from(list);
      if (!arr.length) return;
      setError(null);
      setUploading((n) => n + arr.length);
      const uploaded: UploadedMedia[] = [];
      for (const f of arr) {
        try {
          const u = await uploadFile(f);
          if (u) uploaded.push(u);
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setUploading((n) => n - 1);
        }
      }
      if (uploaded.length) onChange([...files, ...uploaded]);
    },
    [files, onChange, uploadFile],
  );

  return (
    <div>
      <div
        className={`media-uploader ${drag ? "drag" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
        }}
      >
        {uploading > 0 ? (
          <>
            <span className="spinner" /> Uploading {uploading}…
          </>
        ) : (
          <>Drop images / videos here, or click to browse</>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>
      {error && <div className="error small" style={{ marginTop: 8 }}>{error}</div>}
      {files.length > 0 && (
        <div className="media-list">
          {files.map((f, i) => (
            <div key={i} className="media-thumb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.previewUrl} alt={f.name} />
              <button
                className="remove"
                onClick={() => onChange(files.filter((_, j) => j !== i))}
                aria-label="remove"
                type="button"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
