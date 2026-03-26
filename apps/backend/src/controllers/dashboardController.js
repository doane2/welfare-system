const prisma  = require("../lib/prisma")
const { subMonths, format, startOfYear, endOfYear } = require("date-fns")
const { sendContributionReminderEmail } = require("../services/emailService")
const { sendContributionReminderSMS }   = require("../services/smsService")

// ─── Welfare contribution rules ────────────────────────────────────────────────
// SINGLE = KES 200/month  → KES 2,400/year
// FAMILY = KES 500/month  → KES 6,000/year
// Emergency contributions are NOT counted in arrears or annual totals
// Deadline: full annual contribution must be paid by 31 March each year
// Reminder: shown ONLY in March (the final month) if shortfall > 0
// ──────────────────────────────────────────────────────────────────────────────

const RATES = { SINGLE: 200, FAMILY: 500 }

// ─── Shared helpers ────────────────────────────────────────────────────────────

function getRate(member) {
  if (member.monthlyRate && Number(member.monthlyRate) > 0) return Number(member.monthlyRate)
  return RATES[member.memberType] || RATES.SINGLE
}

// A contribution counts as paid if paid=true OR status=APPROVED
const isPaid = (c) => c.paid === true || c.status === "APPROVED"

// ─── Core calculation utility (single source of truth) ────────────────────────
// This function is used by BOTH getMemberDashboard and getMemberStatement
// so calculations are never duplicated or inconsistent.
//
// Annual cycle rules:
//  - Every member owes their full annualRate (monthlyRate × 12) per calendar year
//  - Payment window is Jan 1 – Mar 31 of that year
//  - arrearsBalance  = how much they still owe for the CURRENT year
//  - expectedTotal   = what they should have paid for the current year
//                      (= annualRate, since the full amount is due by Mar 31)
//  - Prior-year shortfalls are captured in totalContributed vs lifetime expected
//
function calcWelfareStats(member, contributions) {
  const now         = new Date()
  const curYear     = now.getFullYear()
  const curMonth    = now.getMonth() + 1  // 1=Jan … 12=Dec
  const monthlyRate = getRate(member)
  const annualRate  = monthlyRate * 12

  // Partition by type — emergency never counts toward annual obligation
  const monthlyContribs   = contributions.filter(c => c.type === "MONTHLY")
  const emergencyContribs = contributions.filter(c => c.type === "EMERGENCY")

  // ── Total contributed (all approved, all types, all time) ──────────────────
  const totalContributed = contributions
    .filter(isPaid)
    .reduce((sum, c) => sum + Number(c.amount), 0)

  // ── This year — all approved contributions Jan 1 – Dec 31 current year ─────
  const yearStart = startOfYear(now)
  const yearEnd   = endOfYear(now)
  const thisYear  = contributions
    .filter(c =>
      isPaid(c) &&
      new Date(c.updatedAt || c.createdAt) >= yearStart &&
      new Date(c.updatedAt || c.createdAt) <= yearEnd
    )
    .reduce((sum, c) => sum + Number(c.amount), 0)

  // ── Annual payment tracking (MONTHLY only, current year) ──────────────────
  // This is what matters for the deadline / reminder logic.
  const annualPaidThisYear = monthlyContribs
    .filter(c =>
      isPaid(c) &&
      new Date(c.updatedAt || c.createdAt).getFullYear() === curYear
    )
    .reduce((sum, c) => sum + Number(c.amount), 0)

  // ── Expected total for current year ───────────────────────────────────────
  // The full annual rate is expected by 31 March — not spread monthly.
  // So expectedTotal is always the full annualRate for the current year.
  const expectedTotal   = annualRate

  // ── Arrears = what they still owe for this year ────────────────────────────
  const arrearsBalance  = Math.max(0, annualRate - annualPaidThisYear)
  const unpaidMonths    = arrearsBalance > 0 ? Math.ceil(arrearsBalance / monthlyRate) : 0

  // ── Welfare standing ───────────────────────────────────────────────────────
  let welfareStanding = "GOOD"
  if      (unpaidMonths >= 4) welfareStanding = "SUSPENDED"
  else if (unpaidMonths >= 2) welfareStanding = "WARNING"

  // ── Annual deadline logic ──────────────────────────────────────────────────
  // deadlinePassed  = we are past March (April onwards) AND shortfall exists
  // showReminder    = we are IN March AND shortfall > 0
  //                   (reminder fires ONLY in the final month, not Jan/Feb)
  const deadlinePassed       = curMonth > 3  // April = 4, onwards
  const annualDeadlineMissed = deadlinePassed && annualPaidThisYear < annualRate
  const annualShortfall      = Math.max(0, annualRate - annualPaidThisYear)

  // monthsToDeadline is used by the frontend reminder banner.
  // We only want the banner in March (1 month to go).
  // Jan and Feb should NOT show the reminder yet.
  const isInMarch        = curMonth === 3
  const monthsToDeadline = isInMarch ? 1 : 0   // only 1 when in March, 0 otherwise

  // ── Monthly chart data (last 12 months, MONTHLY type only) ────────────────
  const monthlyChart = Array.from({ length: 12 }, (_, i) => {
    const d   = subMonths(now, 11 - i)
    const mon = d.getMonth()
    const yr  = d.getFullYear()
    const amt = monthlyContribs
      .filter(c =>
        isPaid(c) &&
        new Date(c.updatedAt || c.createdAt).getMonth()    === mon &&
        new Date(c.updatedAt || c.createdAt).getFullYear() === yr
      )
      .reduce((sum, c) => sum + Number(c.amount), 0)
    return { month: format(d, "MMM"), amount: amt, expected: monthlyRate }
  })

  return {
    monthlyRate,
    annualRate,
    totalContributed,
    thisYear,
    annualPaidThisYear,
    expectedTotal,
    arrearsBalance,
    unpaidMonths,
    welfareStanding,
    annualDeadlineMissed,
    annualShortfall,
    monthsToDeadline,
    monthlyChart,
  }
}

// ─── GET /api/dashboard/me ─────────────────────────────────────────────────────
exports.getMemberDashboard = async (req, res) => {
  try {
    const userId = req.user.id

    const member = await prisma.user.findUnique({
      where:   { id: userId },
      include: {
        group:         { select: { id: true, name: true } },
        contributions: {
          orderBy: { createdAt: "asc" },
          include: {
            payments: {
              select: { id: true, mpesaRef: true, method: true, amount: true, status: true, createdAt: true },
            },
          },
        },
        loans:         { where: { status: { in: ["APPROVED", "PENDING"] } }, take: 1, orderBy: { createdAt: "desc" } },
        claims:        { orderBy: { createdAt: "desc" }, take: 5, select: { id: true, type: true, status: true, createdAt: true, amount: true, title: true } },
        notifications: { where: { read: false }, orderBy: { createdAt: "desc" }, take: 5 },
        dependents:    true,
      },
    })

    if (!member) return res.status(404).json({ message: "Member not found" })

    const stats = calcWelfareStats(member, member.contributions)

    res.json({
      member: {
        id:                member.id,
        fullName:          member.fullName,
        email:             member.email,
        phone:             member.phone,
        memberNumber:      member.memberNumber,
        profilePhoto:      member.profilePhoto,
        group:             member.group,
        isActive:          member.isActive,
        memberType:        member.memberType || "SINGLE",
        monthlyRate:       stats.monthlyRate,
        annualRate:        stats.annualRate,
        loanEligible:      member.loanEligible,
        loanLimitOverride: member.loanLimitOverride,
      },
      // ── Financial stats ──
      totalContributed:    stats.totalContributed,
      thisYear:            stats.thisYear,
      annualPaidThisYear:  stats.annualPaidThisYear,
      expectedTotal:       stats.expectedTotal,
      arrearsBalance:      stats.arrearsBalance,
      unpaidMonths:        stats.unpaidMonths,
      monthlyRate:         stats.monthlyRate,
      annualRate:          stats.annualRate,
      // ── Standing & deadline ──
      welfareStanding:     stats.welfareStanding,
      annualDeadlineMissed: stats.annualDeadlineMissed,
      annualShortfall:     stats.annualShortfall,
      monthsToDeadline:    stats.monthsToDeadline,
      // ── Chart ──
      monthlyChart:        stats.monthlyChart,
      // ── Relations ──
      activeLoan:          member.loans?.[0]    || null,
      recentClaims:        member.claims        || [],
      unreadNotifications: member.notifications || [],
      dependents:          member.dependents    || [],
    })

  } catch (error) {
    console.error("❌ getMemberDashboard error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ─── GET /api/dashboard/me/statement ──────────────────────────────────────────
// Reuses calcWelfareStats — no duplicated calculation logic
exports.getMemberStatement = async (req, res) => {
  try {
    const userId = req.user.id

    const member = await prisma.user.findUnique({
      where:   { id: userId },
      include: { group: { select: { name: true } }, dependents: true },
    })
    if (!member) return res.status(404).json({ message: "Member not found" })

    const contributions = await prisma.contribution.findMany({
      where:   { userId },
      orderBy: { createdAt: "asc" },
      include: {
        payments: { select: { mpesaRef: true, method: true, amount: true, status: true } },
      },
    })

    const loans = await prisma.loan.findMany({
      where:   { userId },
      orderBy: { createdAt: "desc" },
      include: { repayments: true },
    })

    // Use the same shared utility — statement figures always match dashboard
    const stats = calcWelfareStats(member, contributions)

    res.json({
      member: {
        ...member,
        memberType:  member.memberType || "SINGLE",
        monthlyRate: stats.monthlyRate,
        annualRate:  stats.annualRate,
      },
      contributions,
      loans,
      summary: {
        totalPaid:     stats.totalContributed,
        thisYear:      stats.thisYear,
        annualPaid:    stats.annualPaidThisYear,
        expectedTotal: stats.expectedTotal,
        arrears:       stats.arrearsBalance,
        unpaidMonths:  stats.unpaidMonths,
        standing:      stats.welfareStanding,
        monthlyRate:   stats.monthlyRate,
        annualRate:    stats.annualRate,
        memberType:    member.memberType || "SINGLE",
      },
    })
  } catch (error) {
    console.error("❌ getMemberStatement error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ─── POST /api/dashboard/send-reminders ───────────────────────────────────────
// Cron job trigger — sends email + SMS to members with shortfall
// Should be called in March (or you can call it any time for overdue members)
exports.sendAnnualReminders = async (req, res) => {
  try {
    const now     = new Date()
    const curYear = now.getFullYear()

    const members = await prisma.user.findMany({
      where:   { role: "MEMBER", isActive: true },
      include: { contributions: { where: { type: "MONTHLY" } } },
    })

    let sent = 0
    for (const member of members) {
      const stats = calcWelfareStats(member, member.contributions)

      if (stats.annualShortfall > 0) {
        const data = {
          fullName:    member.fullName,
          annualRate:  stats.annualRate,
          paidThisYear: stats.annualPaidThisYear,
          shortfall:   stats.annualShortfall,
          memberType:  member.memberType || "SINGLE",
        }
        await Promise.allSettled([
          sendContributionReminderEmail({ email: member.email, ...data }),
          sendContributionReminderSMS({ phone: member.phone, ...data }),
        ])
        sent++
        console.log(`📧 Reminder sent to ${member.fullName} (shortfall: KES ${stats.annualShortfall})`)
      }
    }

    res.json({ message: `Reminders sent to ${sent} member(s)` })
  } catch (error) {
    console.error("❌ sendAnnualReminders error:", error.message)
    res.status(500).json({ error: error.message })
  }
}
