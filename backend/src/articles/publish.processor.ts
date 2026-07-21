import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SCHEDULED_PUBLISHING_QUEUE } from '../queue/queue.module';

@Processor(SCHEDULED_PUBLISHING_QUEUE)
export class PublishProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {
    super();
  }

  async process(job: Job<{ articleId: string }>) {
    const { articleId } = job.data;
    const article = await this.prisma.article.findUnique({ where: { id: articleId } });
    if (!article || article.status !== 'SCHEDULED') return;

    await this.prisma.article.update({
      where: { id: articleId },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });

    await this.auditService.record({
      actorId: null,
      action: 'UPDATE',
      entity: 'Article',
      entityId: articleId,
      after: { event: 'scheduled_publish', status: 'PUBLISHED' },
    });
  }
}
