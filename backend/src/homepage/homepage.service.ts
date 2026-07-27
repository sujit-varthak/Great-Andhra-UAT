import { Injectable, Logger } from '@nestjs/common';
import { ArticlesService } from '../articles/articles.service';

@Injectable()
export class HomepageService {
  private readonly logger = new Logger(HomepageService.name);

  constructor(private readonly articlesService: ArticlesService) {}

  // Each section is fetched independently so one failing section doesn't take
  // down the rest of the homepage response. New sections (flash news, dont
  // miss, etc.) should follow the same shape: add a settled call below and a
  // key to the returned object.
  async getHomepage() {
    const [bigStory, trending] = await Promise.allSettled([
      this.getBigStory(),
      this.articlesService.findTrendingFeed(15),
    ]);

    if (bigStory.status === 'rejected') {
      this.logger.error('Failed to load bigStory section', bigStory.reason);
    }
    if (trending.status === 'rejected') {
      this.logger.error('Failed to load trending section', trending.reason);
    }

    const bigStoryValue = bigStory.status === 'fulfilled' ? bigStory.value : { hero: null, related: [] };
    const trendingValue = trending.status === 'fulfilled' ? trending.value : [];

    // Whichever article currently holds the hero slot is hidden from every
    // other article-based section — recalculated fresh each request, so once
    // a different article becomes the hero, the old one is no longer excluded.
    const heroId = bigStoryValue.hero?.id;
    const filteredTrending = heroId ? trendingValue.filter((article) => article.id !== heroId) : trendingValue;

    return {
      bigStory: bigStoryValue,
      trending: filteredTrending,
    };
  }

  private async getBigStory() {
    const feed = await this.articlesService.findBigStoryFeed(4);
    return {
      hero: feed[0] ?? null,
      related: feed.slice(1),
    };
  }
}
