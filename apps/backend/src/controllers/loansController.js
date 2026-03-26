const prisma = require("../lib/prisma")
const { sendLoanApprovedEmail, sendLoanRejectedEmail, sendRepaymentConfirmationEmail } = require("../services/emailService")
const { sendLoanApprovedSMS, sendLoanRejectedSMS, sendRepaymentConfirmationSMS } = require("../services/smsService")

// ── Auto-calculate loan limit ────────────────────────────
const calculateAutoLoanLimit = async (userId) => {
  const contributions = await prisma.contribution.findMany({
    where: { userId, paid: true, type: "MONTHLY" }, orderBy: { createdAt: "desc" },
  })
  const totalPaid  = contributions.reduce((s, c) => s + c.amount, 0)
  const monthsPaid = contributions.length
  if (monthsPaid < 6) return { limit: 0, eligible: false, reason: "Minimum 6 months of contributions required" }
  return { limit: totalPaid * 3, eligible: true, reason: `Based on ${monthsPaid} months · KES ${totalPaid.toLocaleString()} paid` }
}

// ── GET loan limit for a member ──────────────────────────
exports.getMemberLoanLimit = async (req, res) => {
  try {
    const { memberId } = req.params
    const member = await prisma.user.findUnique({ where: { id: memberId } })
    if (!member) return res.status(404).json({ message: "Member not found" })
    const auto = await calculateAutoLoanLimit(memberId)
    res.json({
      memberId, memberNumber: member.memberNumber, fullName: member.fullName,
      loanEligible: member.loanEligible, autoLimit: auto.limit, autoReason: auto.reason,
      manualOverride: member.loanLimitOverride,
      effectiveLimit: member.loanLimitOverride ?? auto.limit,
    })
  } catch (error) {
    console.error("❌ getMemberLoanLimit error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ── SET loan eligibility + limit ─────────────────────────
exports.setLoanEligibility = async (req, res) => {
  try {
    const { memberId } = req.params
    const { eligible, limitOverride } = req.body
    const member = await prisma.user.findUnique({ where: { id: memberId } })
    if (!member) return res.status(404).json({ message: "Member not found" })

    const data = {}
    if (typeof eligible === "boolean") data.loanEligible = eligible
    if (limitOverride !== undefined)   data.loanLimitOverride = limitOverride ? parseFloat(limitOverride) : null

    const updated = await prisma.user.update({ where: { id: memberId }, data })

    await prisma.auditLog.create({
      data: { action: eligible ? "ACTIVATE_LOAN_ELIGIBILITY" : "DEACTIVATE_LOAN_ELIGIBILITY", entity: "User", entityId: memberId, userId: req.user.id }
    }).catch(() => {})

    if (eligible) {
      const auto = await calculateAutoLoanLimit(memberId)
      const limit = limitOverride ? parseFloat(limitOverride) : auto.limit
      await prisma.notification.create({
        data: { userId: memberId, channel: "IN_APP", title: "Loan Eligibility Activated", message: `You are now eligible to apply for a loan of up to KES ${limit.toLocaleString()}.`, status: "SENT" }
      }).catch(() => {})
    }

    res.json({ message: `Loan eligibility ${eligible ? "activated" : "deactivated"}`, loanEligible: updated.loanEligible, loanLimitOverride: updated.loanLimitOverride })
  } catch (error) {
    console.error("❌ setLoanEligibility error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ── Generate repayment schedule ──────────────────────────
const genSchedule = (principal, rate, months) => {
  const total   = principal + principal * rate
  const monthly = parseFloat((total / months).toFixed(2))
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() + i + 1)
    return { installment: i + 1, dueDate: d.toISOString(), amount: monthly, paid: false }
  })
}

// ── CREATE LOAN ───────────────────────────────────────────
exports.createLoan = async (req, res) => {
  try {
    const { userId, principal, interestRate, repaymentMonths, notes } = req.body
    if (!userId || !principal || !interestRate || !repaymentMonths) {
      return res.status(400).json({ message: "userId, principal, interestRate and repaymentMonths are required" })
    }
    const member = await prisma.user.findUnique({ where: { id: userId } })
    if (!member || member.role !== "MEMBER") return res.status(404).json({ message: "Member not found" })
    if (!member.loanEligible) return res.status(400).json({ message: "Member is not eligible for a loan. Admin must activate loan eligibility first." })

    const auto  = await calculateAutoLoanLimit(userId)
    const limit = member.loanLimitOverride ?? auto.limit
    if (parseFloat(principal) > limit) return res.status(400).json({ message: `Loan amount KES ${parseFloat(principal).toLocaleString()} exceeds limit of KES ${limit.toLocaleString()}` })

    const active = await prisma.loan.findFirst({ where: { userId, status: { in: ["PENDING", "APPROVED"] } } })
    if (active) return res.status(400).json({ message: "Member already has an active loan application" })

    const loan = await prisma.loan.create({
      data: { userId, principal: parseFloat(principal), interestRate: parseFloat(interestRate), status: "PENDING", repaymentSchedule: genSchedule(parseFloat(principal), parseFloat(interestRate), parseInt(repaymentMonths)), loanLimitSnapshot: limit, notes: notes || null }
    })
    await prisma.auditLog.create({ data: { action: "CREATE_LOAN", entity: "Loan", entityId: loan.id, userId: req.user.id } }).catch(() => {})
    res.status(201).json({ message: "Loan application submitted", loan })
  } catch (error) {
    console.error("❌ createLoan error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ── GET ALL LOANS ─────────────────────────────────────────
exports.getLoans = async (req, res) => {
  try {
    const { page = 1, limit = 15, userId, status } = req.query
    const skip  = (parseInt(page) - 1) * parseInt(limit)
    const where = {
      ...(req.user.role === "MEMBER" ? { userId: req.user.id } : {}),
      ...(userId && req.user.role !== "MEMBER" && { userId }),
      ...(status && { status }),
    }
    const [loans, total] = await Promise.all([
      prisma.loan.findMany({ where, skip, take: parseInt(limit), orderBy: { createdAt: "desc" }, include: { user: { select: { id: true, fullName: true, memberNumber: true } }, repayments: true } }),
      prisma.loan.count({ where }),
    ])
    res.json({ page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)), loans })
  } catch (error) {
    console.error("❌ getLoans error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ── GET SINGLE LOAN ───────────────────────────────────────
exports.getLoanById = async (req, res) => {
  try {
    const loan = await prisma.loan.findUnique({ where: { id: req.params.id }, include: { user: true, repayments: true } })
    if (!loan) return res.status(404).json({ message: "Loan not found" })
    if (req.user.role === "MEMBER" && loan.userId !== req.user.id) return res.status(403).json({ message: "Access denied" })
    res.json({ loan })
  } catch (error) {
    console.error("❌ getLoanById error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ── APPROVE LOAN ──────────────────────────────────────────
exports.approveLoan = async (req, res) => {
  try {
    const { id } = req.params
    const loan   = await prisma.loan.findUnique({ where: { id }, include: { user: true } })
    if (!loan) return res.status(404).json({ message: "Loan not found" })
    if (loan.status !== "PENDING") return res.status(400).json({ message: "Only pending loans can be approved" })

    const updated = await prisma.loan.update({ where: { id }, data: { status: "APPROVED", activatedById: req.user.id } })
    await prisma.auditLog.create({ data: { action: "APPROVE_LOAN", entity: "Loan", entityId: id, userId: req.user.id } }).catch(() => {})

    const nd = { fullName: loan.user.fullName, principal: loan.principal, interestRate: loan.interestRate, repaymentSchedule: loan.repaymentSchedule }
    Promise.allSettled([
      sendLoanApprovedEmail({ email: loan.user.email, ...nd }),
      sendLoanApprovedSMS({ phone: loan.user.phone, ...nd }),
    ]).then(rs => rs.forEach((r, i) => { if (r.status === "rejected") console.error(`⚠️ Loan approval ${i === 0 ? "email" : "SMS"} failed:`, r.reason?.message) }))

    res.json({ message: "Loan approved", loan: updated })
  } catch (error) {
    console.error("❌ approveLoan error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ── REJECT LOAN ───────────────────────────────────────────
exports.rejectLoan = async (req, res) => {
  try {
    const { id } = req.params
    const loan   = await prisma.loan.findUnique({ where: { id }, include: { user: true } })
    if (!loan) return res.status(404).json({ message: "Loan not found" })
    if (loan.status !== "PENDING") return res.status(400).json({ message: "Only pending loans can be rejected" })

    const updated = await prisma.loan.update({ where: { id }, data: { status: "REJECTED" } })
    await prisma.auditLog.create({ data: { action: "REJECT_LOAN", entity: "Loan", entityId: id, userId: req.user.id } }).catch(() => {})

    Promise.allSettled([
      sendLoanRejectedEmail({ email: loan.user.email, fullName: loan.user.fullName, principal: loan.principal }),
      sendLoanRejectedSMS({ phone: loan.user.phone, fullName: loan.user.fullName, principal: loan.principal }),
    ])

    res.json({ message: "Loan rejected", loan: updated })
  } catch (error) {
    console.error("❌ rejectLoan error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ── ADD REPAYMENT ─────────────────────────────────────────
exports.addRepayment = async (req, res) => {
  try {
    const { id } = req.params
    const { amount } = req.body
    if (!amount) return res.status(400).json({ message: "amount is required" })

    const loan = await prisma.loan.findUnique({ where: { id }, include: { repayments: true, user: true } })
    if (!loan) return res.status(404).json({ message: "Loan not found" })
    if (loan.status !== "APPROVED") return res.status(400).json({ message: "Repayments can only be added to approved loans" })

    const repayment   = await prisma.loanRepayment.create({ data: { loanId: id, amount: parseFloat(amount) } })
    const totalRepaid = loan.repayments.reduce((s, r) => s + r.amount, 0) + parseFloat(amount)
    const totalDue    = loan.principal + loan.principal * loan.interestRate
    const fullyPaid   = totalRepaid >= totalDue

    if (fullyPaid) await prisma.loan.update({ where: { id }, data: { status: "PAID" } })
    await prisma.auditLog.create({ data: { action: "ADD_LOAN_REPAYMENT", entity: "Loan", entityId: id, userId: req.user.id } }).catch(() => {})

    const nd = { fullName: loan.user.fullName, amount: parseFloat(amount), totalRepaid, totalDue, fullyPaid }
    Promise.allSettled([
      sendRepaymentConfirmationEmail({ email: loan.user.email, ...nd }),
      sendRepaymentConfirmationSMS({ phone: loan.user.phone, ...nd }),
    ])

    res.status(201).json({ message: "Repayment recorded", repayment, totalRepaid, totalDue, fullyPaid })
  } catch (error) {
    console.error("❌ addRepayment error:", error.message)
    res.status(500).json({ error: error.message })
  }
}
