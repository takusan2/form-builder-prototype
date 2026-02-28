-- AlterTable
ALTER TABLE "Survey" ADD COLUMN     "computedVariables" JSONB NOT NULL DEFAULT '[]';
