-- CreateEnum
CREATE TYPE "AdType" AS ENUM ('IMAGE', 'SCRIPT');

-- CreateEnum
CREATE TYPE "AdZone" AS ENUM (
    'HOMEPAGE_SIDEBAR_LEFT',
    'HOMEPAGE_SIDEBAR_RIGHT',
    'HOMEPAGE_TOP_BANNER',
    'HOMEPAGE_SECTION_INLINE',
    'HOMEPAGE_MOBILE_BANNER',
    'INNER_SIDEBAR_LEFT',
    'INNER_SIDEBAR_RIGHT',
    'INNER_TOP_BANNER',
    'INNER_MOBILE_BANNER',
    'BOXOFFICE_SIDEBAR_LEFT',
    'BOXOFFICE_SIDEBAR_RIGHT',
    'BOXOFFICE_TOP_BANNER',
    'BOXOFFICE_MOBILE_BANNER',
    'ROADBLOCK'
);

-- CreateTable
CREATE TABLE "advertisements" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" "AdType" NOT NULL DEFAULT 'IMAGE',
    "imageUrlDesktop" TEXT,
    "imageUrlMobile" TEXT,
    "landingUrl" TEXT,
    "scriptCode" TEXT,
    "zone" "AdZone" NOT NULL,
    "showOnDesktop" BOOLEAN NOT NULL DEFAULT true,
    "showOnMobile" BOOLEAN NOT NULL DEFAULT true,
    "isRoadblock" BOOLEAN NOT NULL DEFAULT false,
    "roadblockDelayMs" INTEGER NOT NULL DEFAULT 15000,
    "roadblockCookieTTL" INTEGER NOT NULL DEFAULT 900,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "advertisements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "advertisements_zone_isActive_startDate_endDate_idx" ON "advertisements"("zone", "isActive", "startDate", "endDate");

-- AddForeignKey
ALTER TABLE "advertisements" ADD CONSTRAINT "advertisements_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE RESTRICT;
