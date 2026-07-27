import { Injectable, Logger } from '@nestjs/common';
import { ArticlesService } from '../articles/articles.service';

type ArticleSummary = { id: string }[];

@Injectable()
export class HomepageService {
  private readonly logger = new Logger(HomepageService.name);

  constructor(private readonly articlesService: ArticlesService) {}

  // Every plain "latest N articles in category X" section lives here — add a
  // new key + fetcher to extend the homepage with another one. Sections that
  // need their own shape (like bigStory's hero/related split) are handled
  // separately below, then merged into the same response.
  private readonly categorySections: Record<string, () => Promise<ArticleSummary>> = {
    trending: () => this.articlesService.findTrendingFeed(15),
    opinion: () => this.articlesService.findOpinionFeed(5),
    movieNews: () => this.articlesService.findMovieNewsFeed(5),
    movieGossip: () => this.articlesService.findMovieGossipFeed(5),
    andhraNews: () => this.articlesService.findAndhraNewsFeed(5),
    telanganaNews: () => this.articlesService.findTelanganaNewsFeed(5),
    politicsGossip: () => this.articlesService.findPoliticsGossipFeed(5),
    reviews: () => this.articlesService.findReviewsFeed(5),
  };

  // Each section is fetched independently so one failing section doesn't take
  // down the rest of the homepage response.
  async getHomepage() {
    const sectionKeys = Object.keys(this.categorySections);

    const [bigStoryResult, ...sectionResults] = await Promise.allSettled([
      this.getBigStory(),
      ...sectionKeys.map((key) => this.categorySections[key]()),
    ]);

    if (bigStoryResult.status === 'rejected') {
      this.logger.error('Failed to load bigStory section', bigStoryResult.reason);
    }
    const bigStoryValue =
      bigStoryResult.status === 'fulfilled' ? bigStoryResult.value : { hero: null, related: [] };

    // Whichever article currently holds the hero slot is hidden from every
    // other section — recalculated fresh each request, so once a different
    // article becomes the hero, the old one is no longer excluded.
    const heroId = bigStoryValue.hero?.id;
    const excludeHero = (articles: ArticleSummary) =>
      heroId ? articles.filter((article) => article.id !== heroId) : articles;

    const sections: Record<string, ArticleSummary> = {};
    sectionKeys.forEach((key, i) => {
      const result = sectionResults[i];
      if (result.status === 'rejected') {
        this.logger.error(`Failed to load ${key} section`, result.reason);
      }
      sections[key] = excludeHero(result.status === 'fulfilled' ? result.value : []);
    });

    return {
      bigStory: bigStoryValue,
      ...sections,
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
