import { Injectable, Logger } from '@nestjs/common';
import { ArticlesService } from '../articles/articles.service';

@Injectable()
export class HomepageService {
  private readonly logger = new Logger(HomepageService.name);

  constructor(private readonly articlesService: ArticlesService) {}

  // Each section is fetched independently so one failing section doesn't take
  // down the rest of the homepage response. New sections (trending, flash
  // news, etc.) should follow the same shape: add a settled call below and a
  // key to the returned object.
  async getHomepage() {
    const [bigStory] = await Promise.allSettled([this.getBigStory()]);

    if (bigStory.status === 'rejected') {
      this.logger.error('Failed to load bigStory section', bigStory.reason);
    }

    return {
      bigStory: bigStory.status === 'fulfilled' ? bigStory.value : { hero: null, related: [] },
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
