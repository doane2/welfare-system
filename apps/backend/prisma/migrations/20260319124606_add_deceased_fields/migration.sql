-- CreateEnum
CREATE TYPE "DeceasedEntityType" AS ENUM ('MEMBER', 'DEPENDENT');

-- AlterTable
ALTER TABLE "Dependent" ADD COLUMN     "deceasedAt" TIMESTAMP(3),
ADD COLUMN     "deceasedNotes" TEXT,
ADD COLUMN     "isDeceased" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deceasedAt" TIMESTAMP(3),
ADD COLUMN     "deceasedNotes" TEXT,
ADD COLUMN     "isDeceased" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "DeceasedRecord" (
    "id" TEXT NOT NULL,
    "entityType" "DeceasedEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "memberId" TEXT,
    "dependentId" TEXT,
    "deceasedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "flaggedById" TEXT NOT NULL,
    "flaggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isReversed" BOOLEAN NOT NULL DEFAULT false,
    "reversedById" TEXT,
    "reversedAt" TIMESTAMP(3),
    "reversalReason" TEXT,

    CONSTRAINT "DeceasedRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeceasedRecord_entityType_entityId_idx" ON "DeceasedRecord"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "DeceasedRecord_memberId_idx" ON "DeceasedRecord"("memberId");

-- CreateIndex
CREATE INDEX "DeceasedRecord_dependentId_idx" ON "DeceasedRecord"("dependentId");

-- CreateIndex
CREATE INDEX "User_isDeceased_idx" ON "User"("isDeceased");

-- AddForeignKey
ALTER TABLE "DeceasedRecord" ADD CONSTRAINT "DeceasedRecord_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeceasedRecord" ADD CONSTRAINT "DeceasedRecord_dependentId_fkey" FOREIGN KEY ("dependentId") REFERENCES "Dependent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
