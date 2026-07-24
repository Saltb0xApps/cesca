"use client";

interface Props {
  authorName: string;
  body: string;
  media: Array<{ previewUrl: string }>;
}

const SEE_MORE_AT = 210;

export default function LinkedInPreview({ authorName, body, media }: Props) {
  const truncated =
    body.length > SEE_MORE_AT ? body.slice(0, SEE_MORE_AT) : body;
  const hasMore = body.length > SEE_MORE_AT;

  const initial = (authorName || "?").charAt(0).toUpperCase();
  const mediaCount = Math.min(media.length, 4);

  return (
    <div className="preview-panel">
      <div className="preview-label">LinkedIn preview</div>
      <div className="preview-card">
        <div className="preview-header">
          <div className="preview-avatar">{initial}</div>
          <div>
            <div className="preview-author-name">{authorName || "Your account"}</div>
            <div className="preview-author-meta">now · 🌐</div>
          </div>
        </div>
        {body ? (
          <div className="preview-body">
            {truncated}
            {hasMore && <span className="preview-see-more"> …see more</span>}
          </div>
        ) : (
          <div className="preview-empty">Your post will appear here.</div>
        )}
        {media.length > 0 && (
          <div className={`preview-media count-${mediaCount}`}>
            {media.slice(0, 4).map((m, i) => (
              <div key={i} className="preview-media-item">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.previewUrl} alt="" />
              </div>
            ))}
          </div>
        )}
        <div className="preview-footer">
          <span>👍 Like</span>
          <span>💬 Comment</span>
          <span>🔁 Repost</span>
          <span>📤 Send</span>
        </div>
      </div>
    </div>
  );
}
