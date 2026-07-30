-- CreateTable
CREATE TABLE "usa_movie_schedule" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "linkUrl" TEXT NOT NULL,
    "openInNewTab" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usa_movie_schedule_pkey" PRIMARY KEY ("id")
);
