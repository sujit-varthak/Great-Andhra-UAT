'use client';

import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Tag } from '@/lib/types';

interface Props {
  value: Tag[];
  onChange: (tags: Tag[]) => void;
}

export function TagPicker({ value, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Tag[]>([]);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const results = await apiFetch<Tag[]>(`/tags?search=${encodeURIComponent(trimmed)}`);
        setSuggestions(results.filter((t) => !value.some((v) => v.id === t.id)));
      } catch {
        setSuggestions([]);
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, value]);

  function selectTag(tag: Tag) {
    onChange([...value, tag]);
    setQuery('');
    setSuggestions([]);
  }

  function removeTag(id: string) {
    onChange(value.filter((t) => t.id !== id));
  }

  async function createTag() {
    const name = query.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const tag = await apiFetch<Tag>('/tags', { method: 'POST', body: { name } });
      selectTag(tag);
    } catch {
      // ignore — likely already exists or validation failed; leave query as-is
    } finally {
      setCreating(false);
    }
  }

  const trimmed = query.trim();
  const exactMatch = suggestions.some((t) => t.name.toLowerCase() === trimmed.toLowerCase());

  return (
    <div style={{ position: 'relative' }}>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Type to search tags…"
      />

      {open && trimmed.length >= 2 && (suggestions.length > 0 || !exactMatch) && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 10,
            background: 'var(--card-bg, #fff)',
            border: '1px solid #ddd',
            borderRadius: 4,
            maxHeight: 220,
            overflowY: 'auto',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
        >
          {suggestions.map((t) => (
            <div
              key={t.id}
              onMouseDown={(e) => {
                e.preventDefault();
                selectTag(t);
              }}
              style={{ padding: '8px 12px', cursor: 'pointer' }}
            >
              {t.name}
            </div>
          ))}
          {!exactMatch && (
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                createTag();
              }}
              style={{ padding: '8px 12px', cursor: 'pointer', fontStyle: 'italic', color: '#555' }}
            >
              {creating ? 'Creating…' : `+ Create new tag: "${trimmed}"`}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        {value.map((t) => (
          <span
            key={t.id}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 999,
              background: '#eee',
              fontSize: 13,
            }}
          >
            {t.name}
            <button
              type="button"
              onClick={() => removeTag(t.id)}
              aria-label={`Remove ${t.name}`}
              style={{
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: 14,
                lineHeight: 1,
                padding: 0,
              }}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
