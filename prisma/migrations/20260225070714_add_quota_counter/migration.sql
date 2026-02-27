-- CreateTable
CREATE TABLE "QuotaCounter" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "quotaId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuotaCounter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuotaCounter_surveyId_quotaId_key" ON "QuotaCounter"("surveyId", "quotaId");

-- AddForeignKey
ALTER TABLE "QuotaCounter" ADD CONSTRAINT "QuotaCounter_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
