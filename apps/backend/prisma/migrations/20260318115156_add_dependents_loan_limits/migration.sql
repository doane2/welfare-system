-- CreateEnum
CREATE TYPE "DependentType" AS ENUM ('CHILD_UNDER_18', 'CHILD_18_25', 'PARENT', 'SIBLING', 'NEXT_OF_KIN');

-- CreateEnum
CREATE TYPE "MemberType" AS ENUM ('FAMILY', 'SINGLE');

-- AlterTable
ALTER TABLE "Loan" ADD COLUMN     "activatedById" TEXT,
ADD COLUMN     "loanLimitSnapshot" DOUBLE PRECISION,
ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "loanEligible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "loanLimitOverride" DOUBLE PRECISION,
ADD COLUMN     "memberType" "MemberType" NOT NULL DEFAULT 'SINGLE';

-- CreateTable
CREATE TABLE "Dependent" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "type" "DependentType" NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "nationalId" TEXT,
    "birthCertNumber" TEXT,
    "phone" TEXT,
    "relationship" TEXT,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "memberId" TEXT NOT NULL,
    "addedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dependent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Dependent_memberId_idx" ON "Dependent"("memberId");

-- AddForeignKey
ALTER TABLE "Dependent" ADD CONSTRAINT "Dependent_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
