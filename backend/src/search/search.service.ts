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

  // Full-text search over published articles using MySQL's built-in
  // FULLTEXT index on (title, body) — see migration for the index definition.
  async search(query: string, take = 20) {
    if (!query.trim()) return [];

    const rows = await this.prisma.$queryRaw<SearchRow[]>`
      SELECT id, title, slug, excerpt, publishedAt,
             MATCH(title, body) AGAINST(${query} IN NATURAL LANGUAGE MODE) AS rank
      FROM articles
      WHERE status = 'PUBLISHED'
        AND MATCH(title, body) AGAINST(${query} IN NATURAL LANGUAGE MODE)
      ORDER BY rank DESC
      LIMIT ${take}
    `;

    return rows;
  }
}
