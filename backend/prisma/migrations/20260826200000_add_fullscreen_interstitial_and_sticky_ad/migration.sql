-- AlterEnum: two new independent sitewide ad zones (do not touch ROADBLOCK)
ALTER TYPE "AdZone" ADD VALUE 'FULLSCREEN_INTERSTITIAL_AD';
ALTER TYPE "AdZone" ADD VALUE 'BOTTOM_STICKY_AD';

-- CreateEnum
CREATE TYPE "GaPageType" AS ENUM ('HOME', 'ARTICLE', 'BOXOFFICE', 'LISTPAGE', 'ANY');

-- CreateEnum
CREATE TYPE "InterstitialTriggerType" AS ENUM ('TRANSITION', 'TIMER');

-- AlterTable
ALTER TABLE "advertisements" ADD COLUMN "interstitialTriggerType" "InterstitialTriggerType";
ALTER TABLE "advertisements" ADD COLUMN "interstitialFromPage" "GaPageType";
ALTER TABLE "advertisements" ADD COLUMN "interstitialToPage" "GaPageType";
ALTER TABLE "advertisements" ADD COLUMN "interstitialTimerSeconds" INTEGER;
ALTER TABLE "advertisements" ADD COLUMN "interstitialFrequencyHours" INTEGER;
