const prisma = require("../lib/prisma")

// ─── Shared helpers ────────────────────────────────────────────────────────────
const getRate = (member) => {
  if (member.monthlyRate && Number(member.monthlyRate) > 0) return Number(member.monthlyRate)
  return member.memberType === "FAMILY" ? 500 : 200
}

const isPaid = (c) => c.paid === true || c.status === "APPROVED"

const getStanding = (member, contributions, year) => {
  const monthlyRate    = getRate(member)
  const annualRate     = monthlyRate * 12
  const annualPaid     = contributions
    .filter(c =>
      c.type === "MONTHLY" &&
      isPaid(c) &&
      new Date(c.updatedAt || c.createdAt).getFullYear() === year
    )
    .reduce((sum, c) => sum + Number(c.amount), 0)
  const arrearsBalance = Math.max(0, annualRate - annualPaid)
  const unpaidMonths   = arrearsBalance > 0 ? Math.ceil(arrearsBalance / monthlyRate) : 0
  let   standing       = "GOOD"
  if      (unpaidMonths >= 4) standing = "SUSPENDED"
  else if (unpaidMonths >= 2) standing = "WARNING"
  return { standing, annualPaid, arrearsBalance, unpaidMonths, annualRate, monthlyRate }
}

// ─── GET /api/reports/annual?year=2026 ────────────────────────────────────────
// Annual financial summary — contributions, claims, loans, arrears, net balance
exports.getAnnualReport = async (req, res) => {
  try {
    const year     = parseInt(req.query.year) || new Date().getFullYear()
    const yearStart = new Date(`${year}-01-01T00:00:00.000Z`)
    const yearEnd   = new Date(`${year}-12-31T23:59:59.999Z`)

    // ── Members ───────────────────────────────────────────────────────────
    const allMembers = await prisma.user.findMany({
      where:   { role: "MEMBER" },
      include: {
        contributions: {
          where: { type: "MONTHLY" },
          select: { amount: true, paid: true, status: true, type: true, period: true, createdAt: true, updatedAt: true },
        },
      },
    })
    const totalMembers  = allMembers.length
    const activeMembers = allMembers.filter(m => m.isActive).length
    const familyMembers = allMembers.filter(m => m.memberType === "FAMILY").length
    const singleMembers = allMembers.filter(m => m.memberType === "SINGLE").length

    // ── Contributions ─────────────────────────────────────────────────────
    const allContribs = await prisma.contribution.findMany({
      where: {
        updatedAt: { gte: yearStart, lte: yearEnd },
        status: "APPROVED",
        paid:   true,
      },
      select: { amount: true, type: true, userId: true, period: true, updatedAt: true },
    })

    const monthlyContribsTotal    = allContribs.filter(c => c.type === "MONTHLY").reduce((s, c) => s + Number(c.amount), 0)
    const emergencyContribsTotal  = allContribs.filter(c => c.type === "EMERGENCY").reduce((s, c) => s + Number(c.amount), 0)
    const registrationContribsTotal = allContribs.filter(c => c.type === "REGISTRATION").reduce((s, c) => s + Number(c.amount), 0)
    const totalContributions      = monthlyContribsTotal + emergencyContribsTotal + registrationContribsTotal

    // Expected total (all members × annual rate)
    const expectedTotal = allMembers.reduce((sum, m) => sum + getRate(m) * 12, 0)

    // Arrears — total uncollected
    const standingData = allMembers.map(m => getStanding(m, m.contributions, year))
    const totalArrears = standingData.reduce((sum, s) => sum + s.arrearsBalance, 0)

    // Standing breakdown
    const goodCount      = standingData.filter(s => s.standing === "GOOD").length
    const warningCount   = standingData.filter(s => s.standing === "WARNING").length
    const suspendedCount = standingData.filter(s => s.standing === "SUSPENDED").length

    // Monthly breakdown (chart data)
    const months = Array.from({ length: 12 }, (_, i) => {
      const monthStart = new Date(year, i, 1)
      const monthEnd   = new Date(year, i + 1, 0, 23, 59, 59)
      const monthLabel = monthStart.toLocaleString("en-KE", { month: "short" })
      const monthTotal = allContribs
        .filter(c => {
          const d = new Date(c.updatedAt)
          return d >= monthStart && d <= monthEnd
        })
        .reduce((s, c) => s + Number(c.amount), 0)
      return { month: monthLabel, amount: monthTotal }
    })

    // ── Claims ────────────────────────────────────────────────────────────
    const allClaims = await prisma.claim.findMany({
      where:  { createdAt: { gte: yearStart, lte: yearEnd } },
      select: { status: true, type: true, amount: true },
    })

    const claimsTotal    = allClaims.length
    const claimsPending  = allClaims.filter(c => c.status === "PENDING").length
    const claimsApproved = allClaims.filter(c => c.status === "APPROVED").length
    const claimsRejected = allClaims.filter(c => c.status === "REJECTED").length
    const claimsApprovedAmount = allClaims
      .filter(c => c.status === "APPROVED" && c.amount)
      .reduce((s, c) => s + Number(c.amount), 0)

    // Spending by category
    const claimsByCategory = ["MEDICAL", "DEATH", "DISABILITY", "EDUCATION"].map(type => ({
      type,
      count:  allClaims.filter(c => c.type === type).length,
      amount: allClaims.filter(c => c.type === type && c.status === "APPROVED" && c.amount).reduce((s, c) => s + Number(c.amount), 0),
    }))

    // ── Loans ─────────────────────────────────────────────────────────────
    const allLoans = await prisma.loan.findMany({
      where:   { createdAt: { gte: yearStart, lte: yearEnd } },
      include: { repayments: { select: { amount: true } } },
    })

    const loansTotal      = allLoans.length
    const loansPending    = allLoans.filter(l => l.status === "PENDING").length
    const loansApproved   = allLoans.filter(l => l.status === "APPROVED").length
    const loansRejected   = allLoans.filter(l => l.status === "REJECTED").length
    const loansPaid       = allLoans.filter(l => l.status === "PAID").length
    const totalDisbursed  = allLoans
      .filter(l => l.status !== "REJECTED" && l.status !== "PENDING")
      .reduce((s, l) => s + Number(l.principal), 0)
    const totalRepaid     = allLoans
      .reduce((s, l) => s + (l.repayments || []).reduce((rs, r) => rs + Number(r.amount), 0), 0)
    const totalLoanOutstanding = Math.max(0, totalDisbursed - totalRepaid)

    // ── Net balance ───────────────────────────────────────────────────────
    // Income: contributions received
    // Expenses: approved claims paid out + loans disbursed
    const totalIncome   = totalContributions
    const totalExpenses = claimsApprovedAmount + totalDisbursed
    const netBalance    = totalIncome - totalExpenses

    res.json({
      year,
      generatedAt: new Date().toISOString(),
      members: {
        total:    totalMembers,
        active:   activeMembers,
        family:   familyMembers,
        single:   singleMembers,
        standing: { good: goodCount, warning: warningCount, suspended: suspendedCount },
      },
      contributions: {
        total:        totalContributions,
        monthly:      monthlyContribsTotal,
        emergency:    emergencyContribsTotal,
        registration: registrationContribsTotal,
        expected:     expectedTotal,
        arrears:      totalArrears,
        collectionRate: expectedTotal > 0 ? Math.round((monthlyContribsTotal / expectedTotal) * 100) : 0,
        monthlyBreakdown: months,
      },
      claims: {
        total:          claimsTotal,
        pending:        claimsPending,
        approved:       claimsApproved,
        rejected:       claimsRejected,
        approvedAmount: claimsApprovedAmount,
        byCategory:     claimsByCategory,
      },
      loans: {
        total:       loansTotal,
        pending:     loansPending,
        approved:    loansApproved,
        rejected:    loansRejected,
        paid:        loansPaid,
        disbursed:   totalDisbursed,
        repaid:      totalRepaid,
        outstanding: totalLoanOutstanding,
      },
      financials: {
        totalIncome,
        totalExpenses,
        netBalance,
      },
    })
  } catch (error) {
    console.error("❌ getAnnualReport error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ─── GET /api/reports/members?year=2026 ───────────────────────────────────────
// Full member directory with welfare standing for PDF generation
exports.getMembersReport = async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear()

    const members = await prisma.user.findMany({
      where:   { role: "MEMBER" },
      orderBy: { fullName: "asc" },
      include: {
        group:      { select: { name: true } },
        dependents: { select: { fullName: true, type: true } },
        contributions: {
          where:  { type: "MONTHLY" },
          select: { amount: true, paid: true, status: true, type: true, createdAt: true, updatedAt: true },
        },
      },
    })

    const membersWithStanding = members.map(m => {
      const s = getStanding(m, m.contributions, year)
      return {
        id:           m.id,
        fullName:     m.fullName,
        memberNumber: m.memberNumber,
        email:        m.email,
        phone:        m.phone        || "—",
        nationalId:   m.nationalId   || "—",
        memberType:   m.memberType   || "SINGLE",
        monthlyRate:  getRate(m),
        annualRate:   getRate(m) * 12,
        isActive:     m.isActive,
        isDeceased:   m.isDeceased || false,
        group:        m.group?.name  || "—",
        dependentsCount: m.dependents?.length || 0,
        joinedAt:     m.createdAt,
        ...s,
      }
    })

    res.json({
      year,
      generatedAt: new Date().toISOString(),
      total:       membersWithStanding.length,
      members:     membersWithStanding,
    })
  } catch (error) {
    console.error("❌ getMembersReport error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ─── GET /api/reports/financial?year=2026 ─────────────────────────────────────
// Financial receipts data — approved payments with full details
exports.getFinancialReport = async (req, res) => {
  try {
    const year      = parseInt(req.query.year) || new Date().getFullYear()
    const yearStart = new Date(`${year}-01-01T00:00:00.000Z`)
    const yearEnd   = new Date(`${year}-12-31T23:59:59.999Z`)

    const payments = await prisma.payment.findMany({
      where: {
        status:    "APPROVED",
        createdAt: { gte: yearStart, lte: yearEnd },
      },
      orderBy: { createdAt: "desc" },
      include: {
        user:         { select: { id: true, fullName: true, memberNumber: true, email: true, phone: true, memberType: true, monthlyRate: true } },
        contribution: { select: { period: true, type: true } },
      },
    })

    const totalApproved = payments.reduce((s, p) => s + Number(p.amount), 0)
    const byMethod      = ["MPESA", "BANK", "CASH"].map(method => ({
      method,
      count:  payments.filter(p => p.method === method).length,
      amount: payments.filter(p => p.method === method).reduce((s, p) => s + Number(p.amount), 0),
    }))

    res.json({
      year,
      generatedAt:   new Date().toISOString(),
      totalPayments: payments.length,
      totalAmount:   totalApproved,
      byMethod,
      payments:      payments.map((p, i) => ({
        receiptNumber: `RCP-${year}-${String(i + 1).padStart(4, "0")}`,
        id:            p.id,
        member:        p.user,
        amount:        p.amount,
        method:        p.method,
        mpesaRef:      p.mpesaRef || "—",
        period:        p.contribution?.period || "—",
        type:          p.contribution?.type   || "MONTHLY",
        approvedAt:    p.createdAt,
      })),
    })
  } catch (error) {
    console.error("❌ getFinancialReport error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ─── POST /api/reports/deceased ───────────────────────────────────────────────
// Flag a member or dependent as deceased
exports.flagDeceased = async (req, res) => {
  try {
    const { memberId, dependentId, deceasedAt, notes } = req.body

    if (!memberId && !dependentId) {
      return res.status(400).json({ message: "Provide either memberId or dependentId" })
    }

    const adminId = req.user.id

    if (dependentId) {
      // Flag dependent as deceased
      const dep = await prisma.dependent.findUnique({ where: { id: dependentId } })
      if (!dep) return res.status(404).json({ message: "Dependent not found" })

      await prisma.dependent.update({
        where: { id: dependentId },
        data:  {
          isDeceased:  true,
          deceasedAt:  deceasedAt ? new Date(deceasedAt) : new Date(),
          deceasedNotes: notes || null,
        },
      })

      await prisma.auditLog.create({
        data: { action: "FLAG_DEPENDENT_DECEASED", entity: "Dependent", entityId: dependentId, userId: adminId },
      }).catch(() => {})

      return res.json({ message: "Dependent flagged as deceased", type: "dependent" })
    }

    // Flag member as deceased
    const member = await prisma.user.findUnique({ where: { id: memberId } })
    if (!member || member.role !== "MEMBER") return res.status(404).json({ message: "Member not found" })

    await prisma.$transaction(async (tx) => {
      // Update member — mark deceased + deactivate account
      await tx.user.update({
        where: { id: memberId },
        data:  {
          isDeceased:    true,
          deceasedAt:    deceasedAt ? new Date(deceasedAt) : new Date(),
          deceasedNotes: notes || null,
          isActive:      false,   // lock the account
        },
      })

      // In-app notification to any admin who might check
      await tx.auditLog.create({
        data: {
          action:   "FLAG_MEMBER_DECEASED",
          entity:   "User",
          entityId: memberId,
          userId:   adminId,
        },
      })
    })

    console.log(`⚫ Member ${member.memberNumber} flagged as deceased by admin ${adminId}`)
    res.json({ message: `${member.fullName} has been flagged as deceased and account deactivated`, type: "member" })

  } catch (error) {
    console.error("❌ flagDeceased error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ─── POST /api/reports/unflag-deceased ────────────────────────────────────────
// Reverse a deceased flag (data correction)
exports.unflagDeceased = async (req, res) => {
  try {
    const { memberId, dependentId } = req.body

    if (dependentId) {
      await prisma.dependent.update({
        where: { id: dependentId },
        data:  { isDeceased: false, deceasedAt: null, deceasedNotes: null },
      })
      return res.json({ message: "Dependent deceased flag removed" })
    }

    await prisma.user.update({
      where: { id: memberId },
      data:  { isDeceased: false, deceasedAt: null, deceasedNotes: null, isActive: true },
    })

    await prisma.auditLog.create({
      data: { action: "UNFLAG_MEMBER_DECEASED", entity: "User", entityId: memberId, userId: req.user.id },
    }).catch(() => {})

    res.json({ message: "Deceased flag removed — account reactivated" })
  } catch (error) {
    console.error("❌ unflagDeceased error:", error.message)
    res.status(500).json({ error: error.message })
  }
}
