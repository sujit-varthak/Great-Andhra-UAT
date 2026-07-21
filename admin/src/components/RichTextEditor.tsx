'use client';

import { useEffect, useRef } from 'react';

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

// A minimal contentEditable-based rich text editor. Deliberately avoids
// pulling in a full editor framework — the admin panel only needs bold/
// italic/headings/lists for article bodies, not a document-editing suite.
export function RichTextEditor({ value, onChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (ref.current && isFirstRender.current) {
      ref.current.innerHTML = value || '';
      isFirstRender.current = false;
    }
  }, [value]);

  function exec(command: string, arg?: string) {
    document.execCommand(command, false, arg);
    ref.current?.focus();
    if (ref.current) onChange(ref.current.innerHTML);
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
      </div>
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
