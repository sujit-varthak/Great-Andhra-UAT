-- AlterTable
ALTER TABLE "articles" ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isTalkOfTheTown" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shortId" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "articles_shortId_key" ON "articles"("shortId");

