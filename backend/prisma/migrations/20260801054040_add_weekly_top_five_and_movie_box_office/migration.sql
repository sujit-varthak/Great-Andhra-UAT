-- CreateEnum
CREATE TYPE "MovieBoxOfficeSection" AS ENUM ('ALL_TIME', 'USA_BOX_OFFICE');

-- CreateTable
CREATE TABLE "weekly_top_five" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "linkUrl" TEXT NOT NULL,
    "openInNewTab" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekly_top_five_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movie_box_office" (
    "id" TEXT NOT NULL,
    "section" "MovieBoxOfficeSection" NOT NULL,
    "movieName" TEXT NOT NULL,
    "linkUrl" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "openInNewTab" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "movie_box_office_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "movie_box_office_section_idx" ON "movie_box_office"("section");
