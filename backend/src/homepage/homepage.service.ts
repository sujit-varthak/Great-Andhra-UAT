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
    const [bigStory, trending, opinion] = await Promise.allSettled([
      this.getBigStory(),
      this.articlesService.findTrendingFeed(15),
      this.articlesService.findOpinionFeed(5),
    ]);

    if (bigStory.status === 'rejected') {
      this.logger.error('Failed to load bigStory section', bigStory.reason);
    }
    if (trending.status === 'rejected') {
      this.logger.error('Failed to load trending section', trending.reason);
    }
    if (opinion.status === 'rejected') {
      this.logger.error('Failed to load opinion section', opinion.reason);
    }

    const bigStoryValue = bigStory.status === 'fulfilled' ? bigStory.value : { hero: null, related: [] };
    const trendingValue = trending.status === 'fulfilled' ? trending.value : [];
    const opinionValue = opinion.status === 'fulfilled' ? opinion.value : [];

    // Whichever article currently holds the hero slot is hidden from every
    // other article-based section — recalculated fresh each request, so once
    // a different article becomes the hero, the old one is no longer excluded.
    const heroId = bigStoryValue.hero?.id;
    const excludeHero = (articles: typeof trendingValue) =>
      heroId ? articles.filter((article) => article.id !== heroId) : articles;

    return {
      bigStory: bigStoryValue,
      trending: excludeHero(trendingValue),
      opinion: excludeHero(opinionValue),
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
