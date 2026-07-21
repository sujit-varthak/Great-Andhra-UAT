'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';
import { Article } from '@/lib/types';
import { ArticleForm } from '@/components/ArticleForm';

export default function EditArticlePage() {
  const params = useParams();
  const id = params.id as string;
  const [article, setArticle] = useState<Article | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<Article>(`/articles/${id}`)
      .then(setArticle)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load article'));
  }, [id]);

  return (
    <div>
      <div className="page-header">
        <h1>Edit Article</h1>
      </div>
      {error && <p className="error-text">{error}</p>}
      {article ? <ArticleForm article={article} /> : !error && <p className="spinner-text">Loading…</p>}
    </div>
  );
}
