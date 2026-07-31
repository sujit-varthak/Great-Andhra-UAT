-- AlterTable
ALTER TABLE "articles" ADD COLUMN "legacyPostId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "articles_legacyPostId_key" ON "articles"("legacyPostId");
