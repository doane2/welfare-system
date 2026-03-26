-- CreateEnum
CREATE TYPE "BeneficiaryRequestType" AS ENUM ('ADD', 'UPDATE', 'REMOVE');

-- CreateEnum
CREATE TYPE "BeneficiaryRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "BeneficiaryRequest" (
    "id" TEXT NOT NULL,
    "type" "BeneficiaryRequestType" NOT NULL,
    "status" "BeneficiaryRequestStatus" NOT NULL DEFAULT 'PENDING',
    "memberId" TEXT NOT NULL,
    "dependentId" TEXT,
    "fullName" TEXT,
    "dependentType" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "nationalId" TEXT,
    "birthCertNumber" TEXT,
    "phone" TEXT,
    "relationship" TEXT,
    "notes" TEXT,
    "processedById" TEXT,
    "processedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdDependentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BeneficiaryRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BeneficiaryRequest_memberId_idx" ON "BeneficiaryRequest"("memberId");

-- CreateIndex
CREATE INDEX "BeneficiaryRequest_status_idx" ON "BeneficiaryRequest"("status");

-- AddForeignKey
ALTER TABLE "BeneficiaryRequest" ADD CONSTRAINT "BeneficiaryRequest_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BeneficiaryRequest" ADD CONSTRAINT "BeneficiaryRequest_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
