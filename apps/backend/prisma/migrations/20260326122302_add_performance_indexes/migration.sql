-- CreateIndex
CREATE INDEX "Announcement_active_priority_createdAt_idx" ON "Announcement"("active", "priority", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_entity_createdAt_idx" ON "AuditLog"("entity", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "BeneficiaryRequest_status_createdAt_idx" ON "BeneficiaryRequest"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Claim_status_createdAt_idx" ON "Claim"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Claim_userId_type_status_idx" ON "Claim"("userId", "type", "status");

-- CreateIndex
CREATE INDEX "Contribution_userId_paid_type_idx" ON "Contribution"("userId", "paid", "type");

-- CreateIndex
CREATE INDEX "Contribution_period_status_idx" ON "Contribution"("period", "status");

-- CreateIndex
CREATE INDEX "Contribution_status_type_createdAt_idx" ON "Contribution"("status", "type", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "DeceasedRecord_isReversed_flaggedAt_idx" ON "DeceasedRecord"("isReversed", "flaggedAt" DESC);

-- CreateIndex
CREATE INDEX "Dependent_memberId_isDeceased_idx" ON "Dependent"("memberId", "isDeceased");

-- CreateIndex
CREATE INDEX "Loan_userId_status_idx" ON "Loan"("userId", "status");

-- CreateIndex
CREATE INDEX "Loan_status_createdAt_idx" ON "Loan"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Notification_userId_read_createdAt_idx" ON "Notification"("userId", "read", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Payment_contributionId_idx" ON "Payment"("contributionId");

-- CreateIndex
CREATE INDEX "User_role_accountStatus_createdAt_idx" ON "User"("role", "accountStatus", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "User_role_isActive_createdAt_idx" ON "User"("role", "isActive", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "User_role_groupId_idx" ON "User"("role", "groupId");

-- CreateIndex
CREATE INDEX "User_role_accountStatus_isActive_idx" ON "User"("role", "accountStatus", "isActive");
