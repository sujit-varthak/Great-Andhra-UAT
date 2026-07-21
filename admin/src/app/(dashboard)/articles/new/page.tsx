'use client';

import { ArticleForm } from '@/components/ArticleForm';

export default function NewArticlePage() {
  return (
    <div>
      <div className="page-header">
        <h1>New Article</h1>
      </div>
      <ArticleForm />
    </div>
  );
}
