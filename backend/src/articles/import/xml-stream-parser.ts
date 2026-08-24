import { createReadStream } from 'fs';
import * as sax from 'sax';
import slugify from 'slugify';
import { CategoryDef, KNOWN_CATEGORIES, ParsedCategory } from './xml-category-mapping';

export interface ParsedPost {
  legacyPostId: number;
  title: string;
  bodyHtml: string;
  status: string;
  postDate: string | null;
  categories: ParsedCategory[];
  tags: ParsedCategory[];
  featuredImageUrl?: string;
}

function logMemory(label: string) {
  const m = process.memoryUsage();
  const mb = (n: number) => Math.round(n / 1024 / 1024);
  // eslint-disable-next-line no-console
  console.log(`  [memory@${label}] rss=${mb(m.rss)}MB heapUsed=${mb(m.heapUsed)}MB external=${mb(m.external)}MB`);
}

// Single-pass streaming parse via `sax` instead of fast-xml-parser's
// full-DOM parse - never holds more than one item's fields in memory at a
// time, which is what makes this safe on large export files (the previous
// full-DOM approach is what repeatedly OOM-crashed both this import path and
// the standalone backfill script it was extracted from - see
// backend/scripts/fix-images-from-xml.ts's history). One walk of the file
// builds the attachment-id->url map, the post list, AND the channel-level
// category taxonomy, since a post's <item> and the attachment <item> its
// _thumbnail_id points at can appear in either order, and <wp:category>
// definitions live outside any <item> entirely.
export function parseXml(filePath: string): Promise<{ posts: ParsedPost[]; categoryDefs: Map<string, CategoryDef> }> {
  return new Promise((resolve, reject) => {
    const parser = sax.createStream(true, { trim: false });
    const attachmentUrlByPostId = new Map<number, string>();
    // Seeded with the curated hierarchy (see xml-category-mapping.ts) since
    // no export file in this project actually carries <wp:category>
    // definitions - if a future file ever does, its own definitions below
    // still win, since they overwrite these entries as they're parsed.
    const categoryDefs = new Map<string, CategoryDef>(Object.entries(KNOWN_CATEGORIES));
    const rawPosts: Array<{
      postId: number | null;
      title: string;
      bodyHtml: string;
      status: string;
      postDate: string | null;
      postType: string | null;
      categories: ParsedCategory[];
      tags: ParsedCategory[];
      thumbnailId: number | null;
      attachmentUrl: string | null;
      catDomain: string | undefined;
      catNicename: string | undefined;
    }> = [];

    let inItem = false;
    let currentText = '';
    let current: (typeof rawPosts)[number] | null = null;
    let pendingMetaKey: string | null = null;
    let itemCount = 0;

    let inCategoryDef = false;
    let currentCategoryDef: { nicename: string; name: string; parentSlug: string } | null = null;

    parser.on('opentag', (node) => {
      currentText = '';
      if (!inItem && node.name === 'wp:category') {
        inCategoryDef = true;
        currentCategoryDef = { nicename: '', name: '', parentSlug: '' };
      } else if (node.name === 'item') {
        inItem = true;
        current = {
          postId: null,
          title: '',
          bodyHtml: '',
          status: '',
          postDate: null,
          postType: null,
          categories: [],
          tags: [],
          thumbnailId: null,
          attachmentUrl: null,
          catDomain: undefined,
          catNicename: undefined,
        };
      } else if (inItem && current && node.name === 'category') {
        current.catDomain = typeof node.attributes.domain === 'string' ? node.attributes.domain : undefined;
        current.catNicename = typeof node.attributes.nicename === 'string' ? node.attributes.nicename : undefined;
      } else if (inItem && node.name === 'wp:postmeta') {
        pendingMetaKey = null;
      }
    });

    parser.on('text', (text) => {
      currentText += text;
    });
    parser.on('cdata', (text) => {
      currentText += text;
    });

    parser.on('closetag', (name) => {
      if (inCategoryDef && currentCategoryDef) {
        switch (name) {
          case 'wp:category_nicename':
            currentCategoryDef.nicename = currentText.trim();
            break;
          case 'wp:cat_name':
            currentCategoryDef.name = currentText.trim();
            break;
          case 'wp:category_parent':
            currentCategoryDef.parentSlug = currentText.trim();
            break;
          case 'wp:category':
            if (currentCategoryDef.nicename) {
              categoryDefs.set(currentCategoryDef.nicename, {
                name: currentCategoryDef.name || currentCategoryDef.nicename,
                parentSlug: currentCategoryDef.parentSlug || null,
              });
            }
            inCategoryDef = false;
            currentCategoryDef = null;
            break;
        }
        currentText = '';
        return;
      }

      if (!inItem || !current) {
        currentText = '';
        return;
      }
      switch (name) {
        case 'title':
          if (!current.title) current.title = currentText.trim();
          break;
        case 'wp:post_id':
          current.postId = Number(currentText.trim());
          break;
        case 'wp:post_type':
          current.postType = currentText.trim();
          break;
        case 'wp:status':
          current.status = currentText.trim();
          break;
        case 'wp:post_date':
          current.postDate = currentText.trim();
          break;
        case 'content:encoded':
          current.bodyHtml = currentText;
          break;
        case 'wp:attachment_url':
          current.attachmentUrl = currentText.trim();
          break;
        case 'category': {
          const name2 = currentText.trim();
          if (name2) {
            const entry = {
              name: name2,
              slug: current.catNicename || slugify(name2, { lower: true, strict: true }),
            };
            if (current.catDomain === 'post_tag') current.tags.push(entry);
            else if (current.catDomain === 'category') current.categories.push(entry);
          }
          current.catDomain = undefined;
          current.catNicename = undefined;
          break;
        }
        case 'wp:meta_key':
          pendingMetaKey = currentText.trim();
          break;
        case 'wp:meta_value':
          if (pendingMetaKey === '_thumbnail_id') {
            const id = Number(currentText.trim());
            if (id) current.thumbnailId = id;
          }
          pendingMetaKey = null;
          break;
        case 'item': {
          itemCount += 1;
          if (current.postType === 'attachment' && current.postId && current.attachmentUrl) {
            attachmentUrlByPostId.set(current.postId, current.attachmentUrl);
          } else if (current.postType === 'post' && current.postId && current.status !== 'trash') {
            rawPosts.push(current);
          }
          current = null;
          inItem = false;
          if (itemCount % 5000 === 0) logMemory(`parsing item ${itemCount}`);
          break;
        }
      }
      currentText = '';
    });

    parser.on('error', (err) => reject(err));
    parser.on('end', () => {
      const posts: ParsedPost[] = rawPosts.map((p) => ({
        legacyPostId: p.postId as number,
        title: p.title || '(untitled)',
        bodyHtml: p.bodyHtml,
        status: p.status,
        postDate: p.postDate,
        categories: p.categories,
        tags: p.tags,
        featuredImageUrl: p.thumbnailId ? attachmentUrlByPostId.get(p.thumbnailId) : undefined,
      }));
      resolve({ posts, categoryDefs });
    });

    createReadStream(filePath).pipe(parser as unknown as NodeJS.WritableStream);
  });
}
