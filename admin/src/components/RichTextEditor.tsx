'use client';

import { useEffect, useRef, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';

interface Props {
  value: string;
  onChange: (html: string) => void;
}

const COMMANDS: { label: string; command: string; arg?: string }[] = [
  { label: 'B', command: 'bold' },
  { label: 'I', command: 'italic' },
  { label: 'U', command: 'underline' },
  { label: 'H2', command: 'formatBlock', arg: 'H2' },
  { label: 'P', command: 'formatBlock', arg: 'P' },
  { label: '• List', command: 'insertUnorderedList' },
  { label: '1. List', command: 'insertOrderedList' },
  { label: 'Quote', command: 'formatBlock', arg: 'BLOCKQUOTE' },
];

function getYouTubeEmbedUrl(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

function getVimeoEmbedUrl(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? `https://player.vimeo.com/video/${m[1]}` : null;
}

// Paste-a-link path: YouTube/Vimeo become an embedded player, a direct
// video-file URL becomes a <video> tag, anything else falls back to a plain
// link rather than guessing.
function buildVideoEmbedHtml(url: string): string {
  const youTubeUrl = getYouTubeEmbedUrl(url);
  if (youTubeUrl) {
    return `<iframe src="${youTubeUrl}" width="560" height="315" style="max-width:100%" frameborder="0" allowfullscreen></iframe>`;
  }
  const vimeoUrl = getVimeoEmbedUrl(url);
  if (vimeoUrl) {
    return `<iframe src="${vimeoUrl}" width="560" height="315" style="max-width:100%" frameborder="0" allowfullscreen></iframe>`;
  }
  if (/\.(mp4|webm|mov)(\?.*)?$/i.test(url)) {
    return `<video src="${url}" controls style="max-width:100%"></video>`;
  }
  return `<a href="${url}" target="_blank" rel="noreferrer">${url}</a>`;
}

// A minimal contentEditable-based rich text editor. Deliberately avoids
// pulling in a full editor framework — the admin panel only needs bold/
// italic/headings/lists/media for article bodies, not a document-editing
// suite.
export function RichTextEditor({ value, onChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  const savedRange = useRef<Range | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (ref.current && isFirstRender.current) {
      ref.current.innerHTML = value || '';
      isFirstRender.current = false;
    }
  }, [value]);

  function exec(command: string, arg?: string) {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    if (ref.current) onChange(ref.current.innerHTML);
  }

  // Opening a native file picker (unlike window.prompt) can lose the
  // in-editor text selection, so it's captured before the picker opens and
  // restored right before inserting — otherwise an upload always lands at
  // the end of the body instead of where the cursor was.
  function saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && ref.current?.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    } else if (ref.current) {
      // Selection isn't inside the editor right now (e.g. a previous upload
      // attempt's file picker stole focus and never restored it) - fall back
      // to the end of the content rather than reusing a stale range or
      // leaving null, which would otherwise insert at an unrelated spot.
      const range = document.createRange();
      range.selectNodeContents(ref.current);
      range.collapse(false);
      savedRange.current = range;
    }
  }

  function insertHtmlAtSavedSelection(html: string) {
    ref.current?.focus();
    const sel = window.getSelection();
    if (sel && savedRange.current) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
    document.execCommand('insertHTML', false, html);
    if (ref.current) onChange(ref.current.innerHTML);
  }

  async function handleImageFile(file: File) {
    setError('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiFetch<{ url: string }>('/media/upload', {
        method: 'POST',
        body: formData,
        isForm: true,
      });
      insertHtmlAtSavedSelection(`<img src="${res.url}" style="max-width:100%" />`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Image upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleVideoFile(file: File) {
    setError('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiFetch<{ url: string }>('/media/upload-video', {
        method: 'POST',
        body: formData,
        isForm: true,
      });
      insertHtmlAtSavedSelection(`<video src="${res.url}" controls style="max-width:100%"></video>`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Video upload failed');
    } finally {
      setUploading(false);
    }
  }

  function handleVideoClick() {
    saveSelection();
    const wantsUpload = window.confirm(
      'Click OK to upload a video file, or Cancel to paste a video link instead (YouTube, Vimeo, or a direct video URL).',
    );
    if (wantsUpload) {
      videoInputRef.current?.click();
    } else {
      const url = window.prompt('Video URL');
      if (url) insertHtmlAtSavedSelection(buildVideoEmbedHtml(url));
    }
  }

  // Escape hatch for anything the URL-detection path doesn't cover - Twitter/X,
  // Instagram, maps, or a YouTube/Vimeo embed code copied straight from their
  // own "Share > Embed" button. Inserted verbatim, no parsing - the author is
  // trusted to paste a real embed snippet, same trust level the rest of this
  // editor already assumes (there's no body sanitization on save either).
  function handleEmbedClick() {
    saveSelection();
    const html = window.prompt('Paste embed code (iframe/HTML snippet)');
    if (html) insertHtmlAtSavedSelection(html);
  }

  return (
    <div>
      <div className="rich-editor-toolbar">
        {COMMANDS.map((c) => (
          <button key={c.label} type="button" onClick={() => exec(c.command, c.arg)}>
            {c.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            const url = window.prompt('Link URL');
            if (url) exec('createLink', url);
          }}
        >
          Link
        </button>
        <button
          type="button"
          disabled={uploading}
          onClick={() => {
            saveSelection();
            imageInputRef.current?.click();
          }}
        >
          Image
        </button>
        <button type="button" disabled={uploading} onClick={handleVideoClick}>
          Video
        </button>
        <button type="button" onClick={handleEmbedClick}>
          Embed
        </button>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImageFile(file);
            e.target.value = '';
          }}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleVideoFile(file);
            e.target.value = '';
          }}
        />
      </div>
      {uploading && <p className="hint-text" style={{ margin: '4px 0' }}>Uploading…</p>}
      {error && <p className="error-text" style={{ margin: '4px 0' }}>{error}</p>}
      <div
        ref={ref}
        className="rich-editor-content"
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
      />
    </div>
  );
}
