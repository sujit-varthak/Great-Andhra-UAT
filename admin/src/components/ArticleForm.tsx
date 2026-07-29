'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';
import { Article, ArticleStatus, Category, Tag } from '@/lib/types';
import { RichTextEditor } from './RichTextEditor';
import { ImageUploader } from './ImageUploader';
import { TagPicker } from './TagPicker';

const STATUS_OPTIONS: ArticleStatus[] = ['DRAFT', 'IN_REVIEW', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED'];

interface Props {
  article?: Article;
}

export function ArticleForm({ article }: Props) {
  const router = useRouter();
  const isEdit = Boolean(article);

  const [categories, setCategories] = useState<Category[]>([]);

  const [title, setTitle] = useState(article?.title ?? '');
  const [body, setBody] = useState(article?.body ?? '');
  const [excerpt, setExcerpt] = useState(article?.excerpt ?? '');
  const [categoryId, setCategoryId] = useState(article?.categoryId ?? '');
  const [selectedTags, setSelectedTags] = useState<Tag[]>(article?.tags?.map((t) => t.tag) ?? []);
  const [publisherName, setPublisherName] = useState(article?.publisherName ?? '');
  const [featuredImageUrl, setFeaturedImageUrl] = useState<string | null>(
    article?.featuredImageUrl ?? null,
  );
  const [seoTitle, setSeoTitle] = useState(article?.seoTitle ?? '');
  const [seoDescription, setSeoDescription] = useState(article?.seoDescription ?? '');
  const [isHot, setIsHot] = useState(article?.isHot ?? false);
  const [isTrending, setIsTrending] = useState(article?.isTrending ?? false);
  const [isTopFive, setIsTopFive] = useState(article?.isTopFive ?? false);
  const [isMobileVisible, setIsMobileVisible] = useState(article?.isMobileVisible ?? true);
  const [isBigStory, setIsBigStory] = useState(article?.isBigStory ?? false);
  const [status, setStatus] = useState<ArticleStatus>(article?.status ?? 'DRAFT');
  const [scheduledAt, setScheduledAt] = useState(
    article?.scheduledAt ? article.scheduledAt.slice(0, 16) : '',
  );
  const [cast, setCast] = useState(
    Array.isArray((article?.schemaData as any)?.cast)
      ? ((article?.schemaData as any).cast as string[]).join(', ')
      : '',
  );
  const [director, setDirector] = useState((article?.schemaData as any)?.director ?? '');
  const [movieRating, setMovieRating] = useState((article?.schemaData as any)?.rating ?? '');

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<Category[]>('/categories').then(setCategories).catch(() => {});
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);

    const schemaData =
      cast || director || movieRating
        ? {
            cast: cast
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
            director: director || undefined,
            rating: movieRating ? Number(movieRating) : undefined,
          }
        : undefined;

    const payload = {
      title,
      body,
      excerpt: excerpt || undefined,
      categoryId: categoryId || undefined,
      tagIds: selectedTags.map((t) => t.id),
      publisherName: publisherName || undefined,
      featuredImageUrl: featuredImageUrl || undefined,
      seoTitle: seoTitle || undefined,
      seoDescription: seoDescription || undefined,
      isHot,
      isTrending,
      isTopFive,
      isMobileVisible,
      isBigStory,
      status,
      scheduledAt: status === 'SCHEDULED' && scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      schemaData,
    };

    try {
      if (isEdit && article) {
        await apiFetch(`/articles/${article.id}`, { method: 'PATCH', body: payload });
      } else {
        await apiFetch('/articles', { method: 'POST', body: payload });
      }
      router.push('/articles');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save article');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="card">
        <div className="field">
          <label htmlFor="title">Title</label>
          <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>

        <div className="field">
          <label>Body</label>
          <RichTextEditor value={body} onChange={setBody} />
        </div>

        <div className="field">
          <label htmlFor="excerpt">Excerpt</label>
          <textarea id="excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
        </div>
      </div>

      <div className="card">
        <div className="field-row">
          <div className="field">
            <label htmlFor="category">Category</label>
            <select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">— None —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="publisher">Publisher name</label>
            <input
              id="publisher"
              value={publisherName}
              onChange={(e) => setPublisherName(e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label>Tags</label>
          <TagPicker value={selectedTags} onChange={setSelectedTags} />
        </div>

        <ImageUploader value={featuredImageUrl} onChange={setFeaturedImageUrl} label="Featured image" />
      </div>

      <div className="card">
        <div className="field-row">
          <div className="field">
            <label htmlFor="seoTitle">SEO title</label>
            <input id="seoTitle" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="seoDescription">SEO description</label>
          <textarea
            id="seoDescription"
            value={seoDescription}
            onChange={(e) => setSeoDescription(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        <label className="checkbox-row">
          <input type="checkbox" checked={isHot} onChange={(e) => setIsHot(e.target.checked)} /> Hot
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={isTrending}
            onChange={(e) => setIsTrending(e.target.checked)}
          />{' '}
          Trending
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={isTopFive}
            onChange={(e) => setIsTopFive(e.target.checked)}
          />{' '}
          Top Five
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={isMobileVisible}
            onChange={(e) => setIsMobileVisible(e.target.checked)}
          />{' '}
          Mobile visible
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={isBigStory}
            onChange={(e) => setIsBigStory(e.target.checked)}
          />{' '}
          Big Story
        </label>
      </div>

      <div className="card">
        <div className="field-row">
          <div className="field">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ArticleStatus)}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
          {status === 'SCHEDULED' && (
            <div className="field">
              <label htmlFor="scheduledAt">Publish at</label>
              <input
                id="scheduledAt"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
              />
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <p className="hint-text" style={{ marginTop: 0 }}>
          Movie/review details (optional) — populates rich search-result snippets
        </p>
        <div className="field-row">
          <div className="field">
            <label htmlFor="director">Director</label>
            <input id="director" value={director} onChange={(e) => setDirector(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="movieRating">Rating (0-10)</label>
            <input
              id="movieRating"
              type="number"
              min={0}
              max={10}
              step={0.1}
              value={movieRating}
              onChange={(e) => setMovieRating(e.target.value)}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="cast">Cast (comma-separated)</label>
          <input id="cast" value={cast} onChange={(e) => setCast(e.target.value)} />
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="toolbar">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create article'}
        </button>
        <button type="button" className="btn" onClick={() => router.push('/articles')}>
          Cancel
        </button>
      </div>
    </form>
  );
}
