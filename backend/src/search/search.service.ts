import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface SearchRow {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  publishedAt: Date | null;
  rank: number;
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  // Full-text search over published articles using Postgres's built-in
  // tsvector/tsquery — computed at query time rather than a stored column,
  // since this dataset's scale doesn't need a materialized search index yet.
  // For higher volume, add a GIN index on to_tsvector('english', title || ' ' || body).
  async search(query: string, take = 20) {
    if (!query.trim()) return [];

    const rows = await this.prisma.$queryRaw<SearchRow[]>`
      SELECT id, title, slug, excerpt, "publishedAt",
             ts_rank(to_tsvector('english', title || ' ' || body), plainto_tsquery('english', ${query})) AS rank
      FROM articles
      WHERE status = 'PUBLISHED'
        AND to_tsvector('english', title || ' ' || body) @@ plainto_tsquery('english', ${query})
      ORDER BY rank DESC
      LIMIT ${take}
    `;

    return rows;
  }
}
