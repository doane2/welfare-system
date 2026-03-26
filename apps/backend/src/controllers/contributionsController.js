const prisma = require("../lib/prisma")
const {
  sendContributionApprovedEmail,
} = require("../services/emailService")

// ── Helper: fire email + SMS without blocking the response ───────────────────
const notifyMemberApproved = (member, contribution) => {
  // Email
  sendContributionApprovedEmail({
    email:    member.email,
    fullName: member.fullName,
    amount:   contribution.amount,
    period:   contribution.period,
    type:     contribution.type,
  }).catch(e => console.error("⚠️ Contribution approval email failed:", e.message))

  // SMS stub — wire up to your SMS provider when Daraja credentials arrive
  // Example with Africa's Talking:
  // smsClient.send({ to: member.phone, message: `...` }).catch(() => {})
  if (member.phone) {
    console.log(`📱 [SMS stub] To: ${member.phone} — ${member.fullName}, your ${contribution.type} contribution of KES ${Number(contribution.amount).toLocaleString()} for ${contribution.period} has been approved.`)
  }
}

// ─── CREATE CONTRIBUTION ───────────────────────────────────────────────────────
exports.createContribution = async (req, res) => {
  try {
    const { userId, amount, type, period, dueDate } = req.body

    if (!userId || !amount || !type || !period || !dueDate)
      return res.status(400).json({ message: "userId, amount, type, period and dueDate are required" })

    const member = await prisma.user.findUnique({ where: { id: userId } })
    if (!member) return res.status(404).json({ message: "Member not found" })

    const contribution = await prisma.contribution.create({
      data: {
        userId,
        amount:  parseFloat(amount),
        type,
        period,
        dueDate: new Date(dueDate),
        paid:    false,
        status:  "PENDING",
      },
    })

    await prisma.auditLog.create({
      data: { action: "CREATE_CONTRIBUTION", entity: "Contribution", entityId: contribution.id, userId: req.user.id },
    }).catch(() => {})

    // In-app notification so member sees it immediately on their dashboard
    await prisma.notification.create({
      data: {
        userId:  userId,
        channel: "IN_APP",
        title:   "Contribution recorded",
        message: `A ${type} contribution of KES ${Number(amount).toLocaleString()} for ${period} has been recorded on your account. Status: Pending approval.`,
        status:  "SENT",
        sentAt:  new Date(),
      },
    }).catch(() => {})

    res.status(201).json({ message: "Contribution created", contribution })
  } catch (error) {
    console.error("❌ createContribution error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ─── GET ALL CONTRIBUTIONS ─────────────────────────────────────────────────────
exports.getContributions = async (req, res) => {
  try {
    const { page = 1, limit = 15, userId, status, type } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)

    const where = {
      // Members always see only their own — never leaks other members' data
      ...(req.user.role === "MEMBER" ? { userId: req.user.id } : {}),
      ...(userId && req.user.role !== "MEMBER" ? { userId } : {}),
      ...(status && status !== "ALL" ? { status } : {}),
      ...(type   && type   !== "ALL" ? { type }   : {}),
    }

    const [contributions, total] = await Promise.all([
      prisma.contribution.findMany({
        where,
        skip,
        take:    parseInt(limit),
        orderBy: { createdAt: "desc" },
        include: {
          user:       { select: { id: true, fullName: true, memberNumber: true } },
          approvedBy: { select: { id: true, fullName: true } },
          payments:   { select: { id: true, mpesaRef: true, method: true, amount: true, status: true } },
        },
      }),
      prisma.contribution.count({ where }),
    ])

    res.json({
      page:       parseInt(page),
      limit:      parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      contributions,
    })
  } catch (error) {
    console.error("❌ getContributions error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ─── GET SINGLE CONTRIBUTION ───────────────────────────────────────────────────
exports.getContributionById = async (req, res) => {
  try {
    const contribution = await prisma.contribution.findUnique({
      where:   { id: req.params.id },
      include: { user: true, approvedBy: true, payments: true },
    })
    if (!contribution) return res.status(404).json({ message: "Contribution not found" })
    if (req.user.role === "MEMBER" && contribution.userId !== req.user.id)
      return res.status(403).json({ message: "Access denied" })

    res.json({ contribution })
  } catch (error) {
    console.error("❌ getContributionById error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ─── EDIT CONTRIBUTION (Admin) ─────────────────────────────────────────────────
exports.editContribution = async (req, res) => {
  try {
    const { id } = req.params
    const { amount, type, period, dueDate, paid, status } = req.body

    const existing = await prisma.contribution.findUnique({
      where:   { id },
      include: { user: true },
    })
    if (!existing) return res.status(404).json({ message: "Contribution not found" })

    const data = {}
    if (amount !== undefined) data.amount  = parseFloat(amount)
    if (type)                 data.type    = type
    if (period)               data.period  = period
    if (dueDate)              data.dueDate = new Date(dueDate)
    if (paid !== undefined)   data.paid    = paid
    if (status)               data.status  = status

    const isApproving = paid === true || status === "APPROVED"
    if (isApproving) {
      data.paid         = true
      data.status       = "APPROVED"
      data.approvedById = req.user.id
      data.approvedAt   = new Date()
    }

    if (Object.keys(data).length === 0)
      return res.status(400).json({ message: "No valid fields to update" })

    const updated = await prisma.contribution.update({ where: { id }, data })

    await prisma.auditLog.create({
      data: { action: "EDIT_CONTRIBUTION", entity: "Contribution", entityId: id, userId: req.user.id },
    }).catch(() => {})

    // In-app notification
    await prisma.notification.create({
      data: {
        userId:  existing.userId,
        channel: "IN_APP",
        title:   isApproving ? "Contribution Approved ✓" : "Contribution Updated",
        message: isApproving
          ? `Your ${updated.type} contribution of KES ${Number(updated.amount).toLocaleString()} for ${updated.period} has been approved.`
          : `Your ${updated.type} contribution for ${updated.period} has been updated. Status: ${updated.status}.`,
        status: "SENT",
        sentAt: new Date(),
      },
    }).catch(() => {})

    // ── Fire email + SMS when admin approves via edit ─────────────────────
    if (isApproving) {
      notifyMemberApproved(existing.user, updated)
    }

    console.log(`✅ Contribution ${id} edited by ${req.user.id}`)
    res.json({ message: "Contribution updated", contribution: updated })
  } catch (error) {
    console.error("❌ editContribution error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ─── APPROVE CONTRIBUTION ──────────────────────────────────────────────────────
exports.approveContribution = async (req, res) => {
  try {
    const { id } = req.params

    const existing = await prisma.contribution.findUnique({
      where:   { id },
      include: { user: true },
    })
    if (!existing)                     return res.status(404).json({ message: "Contribution not found" })
    if (existing.status !== "PENDING") return res.status(400).json({ message: "Only pending contributions can be approved" })

    const updated = await prisma.contribution.update({
      where: { id },
      data:  { status: "APPROVED", paid: true, approvedById: req.user.id, approvedAt: new Date() },
    })

    await prisma.notification.create({
      data: {
        userId:  existing.userId,
        channel: "IN_APP",
        title:   "Contribution Approved ✓",
        message: `Your ${existing.type} contribution of KES ${Number(existing.amount).toLocaleString()} for ${existing.period} has been approved.`,
        status:  "SENT",
        sentAt:  new Date(),
      },
    }).catch(() => {})

    await prisma.auditLog.create({
      data: { action: "APPROVE_CONTRIBUTION", entity: "Contribution", entityId: id, userId: req.user.id },
    }).catch(() => {})

    // ── Respond immediately then fire notifications ────────────────────────
    console.log(`✅ Contribution ${id} approved — notifying ${existing.user.email}`)
    res.json({ message: "Contribution approved", contribution: updated })

    notifyMemberApproved(existing.user, existing)
  } catch (error) {
    console.error("❌ approveContribution error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ─── REJECT CONTRIBUTION ───────────────────────────────────────────────────────
exports.rejectContribution = async (req, res) => {
  try {
    const { id } = req.params

    const existing = await prisma.contribution.findUnique({
      where: { id }, include: { user: true },
    })
    if (!existing)                     return res.status(404).json({ message: "Contribution not found" })
    if (existing.status !== "PENDING") return res.status(400).json({ message: "Only pending contributions can be rejected" })

    const updated = await prisma.contribution.update({
      where: { id },
      data:  { status: "REJECTED" },
    })

    await prisma.notification.create({
      data: {
        userId:  existing.userId,
        channel: "IN_APP",
        title:   "Contribution Rejected",
        message: `Your ${existing.type} contribution of KES ${Number(existing.amount).toLocaleString()} for ${existing.period} was not approved. Contact your administrator.`,
        status:  "SENT",
        sentAt:  new Date(),
      },
    }).catch(() => {})

    await prisma.auditLog.create({
      data: { action: "REJECT_CONTRIBUTION", entity: "Contribution", entityId: id, userId: req.user.id },
    }).catch(() => {})

    console.log(`✅ Contribution ${id} rejected`)
    res.json({ message: "Contribution rejected", contribution: updated })
  } catch (error) {
    console.error("❌ rejectContribution error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ─── DELETE CONTRIBUTION ───────────────────────────────────────────────────────
exports.deleteContribution = async (req, res) => {
  try {
    const { id } = req.params

    const existing = await prisma.contribution.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ message: "Contribution not found" })

    await prisma.contribution.delete({ where: { id } })

    await prisma.auditLog.create({
      data: { action: "DELETE_CONTRIBUTION", entity: "Contribution", entityId: id, userId: req.user.id },
    }).catch(() => {})

    res.json({ message: "Contribution deleted" })
  } catch (error) {
    console.error("❌ deleteContribution error:", error.message)
    res.status(500).json({ error: error.message })
  }
}
