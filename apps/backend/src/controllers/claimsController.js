const prisma = require("../lib/prisma")
const {
  sendClaimApprovedEmail,
  sendClaimRejectedEmail,
} = require("../services/emailService")
const {
  sendClaimApprovedSMS,
  sendClaimRejectedSMS,
} = require("../services/smsService")

const safeClaimFields = (c) => ({
  id:           c.id,
  type:         c.type,
  title:        c.title,
  description:  c.description,
  amount:       c.amount,
  status:       c.status,
  rejectionReason: c.rejectionReason || null,
  userId:       c.userId,
  reviewedById: c.reviewedById,
  user:         c.user         || undefined,
  reviewedBy:   c.reviewedBy   || undefined,
  documents:    c.documents    || [],
  createdAt:    c.createdAt,
  updatedAt:    c.updatedAt,
})

// ── CREATE CLAIM ──────────────────────────────────────────────────────────────
exports.createClaim = async (req, res) => {
  try {
    const { type, title, description, amount, documents } = req.body

    if (!type || !title || !description)
      return res.status(400).json({ message: "type, title and description are required" })

    const validTypes = ["MEDICAL", "DEATH", "DISABILITY", "EDUCATION"]
    if (!validTypes.includes(type))
      return res.status(400).json({ message: `type must be one of: ${validTypes.join(", ")}` })

    const claim = await prisma.claim.create({
      data: {
        type, title, description,
        amount:  amount ? parseFloat(amount) : null,
        status:  "PENDING",
        userId:  req.user.id,
        documents: documents && documents.length > 0
          ? { create: documents.map(d => ({ url: d.url, filename: d.filename, mimeType: d.mimeType || null })) }
          : undefined,
      },
      include: { documents: true },
    })

    await prisma.auditLog.create({
      data: { action: "CREATE_CLAIM", entity: "Claim", entityId: claim.id, userId: req.user.id }
    }).catch(e => console.error("⚠️ Audit log failed:", e.message))

    // In-app notification to admins
    const admins = await prisma.user.findMany({
      where:  { role: { in: ["SUPER_ADMIN", "TREASURER"] }, isActive: true },
      select: { id: true },
    })
    await Promise.allSettled(
      admins.map(a => prisma.notification.create({
        data: {
          userId:  a.id,
          channel: "IN_APP",
          title:   "New claim submitted",
          message: `A new ${type} claim has been submitted and needs review.`,
          status:  "SENT",
          sentAt:  new Date(),
        },
      }))
    )

    console.log("✅ Claim created:", claim.id)
    res.status(201).json({ message: "Claim submitted successfully", claim: safeClaimFields(claim) })
  } catch (error) {
    console.error("❌ createClaim error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ── GET ALL CLAIMS ────────────────────────────────────────────────────────────
exports.getClaims = async (req, res) => {
  try {
    const { page = 1, limit = 15, userId, type, status, search = "" } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)

    const where = {
      ...(req.user.role === "MEMBER" ? { userId: req.user.id } : {}),
      ...(userId && req.user.role !== "MEMBER" ? { userId } : {}),
      ...(type   ? { type }   : {}),
      ...(status ? { status } : {}),
      ...(search ? {
        OR: [
          { title:       { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      } : {}),
    }

    const [claims, total] = await Promise.all([
      prisma.claim.findMany({
        where, skip, take: parseInt(limit),
        orderBy: { createdAt: "desc" },
        include: {
          user:       { select: { id: true, fullName: true, memberNumber: true, email: true, phone: true } },
          reviewedBy: { select: { id: true, fullName: true } },
          documents:  true,
        },
      }),
      prisma.claim.count({ where }),
    ])

    // Stats (admin only)
    let stats = null
    if (req.user.role !== "MEMBER") {
      const [pending, approved, rejected, total_all] = await Promise.all([
        prisma.claim.count({ where: { status: "PENDING"  } }),
        prisma.claim.count({ where: { status: "APPROVED" } }),
        prisma.claim.count({ where: { status: "REJECTED" } }),
        prisma.claim.count(),
      ])
      const approvedSum = await prisma.claim.aggregate({
        _sum: { amount: true }, where: { status: "APPROVED" }
      })
      const byType = await Promise.all(
        ["MEDICAL","DEATH","DISABILITY","EDUCATION"].map(async t => ({
          type:   t,
          count:  await prisma.claim.count({ where: { type: t } }),
          amount: (await prisma.claim.aggregate({ _sum: { amount: true }, where: { type: t, status: "APPROVED" } }))._sum.amount || 0,
        }))
      )
      stats = { pending, approved, rejected, total: total_all, approvedAmount: approvedSum._sum.amount || 0, byType }
    }

    res.json({ page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)), stats, claims })
  } catch (error) {
    console.error("❌ getClaims error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ── GET SINGLE CLAIM ──────────────────────────────────────────────────────────
exports.getClaimById = async (req, res) => {
  try {
    const claim = await prisma.claim.findUnique({
      where:   { id: req.params.id },
      include: {
        user:       { select: { id: true, fullName: true, memberNumber: true, email: true } },
        reviewedBy: { select: { id: true, fullName: true } },
        documents:  true,
      },
    })
    if (!claim) return res.status(404).json({ message: "Claim not found" })
    if (req.user.role === "MEMBER" && claim.userId !== req.user.id)
      return res.status(403).json({ message: "Access denied" })

    res.json({ claim: safeClaimFields(claim) })
  } catch (error) {
    console.error("❌ getClaimById error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ── APPROVE CLAIM ─────────────────────────────────────────────────────────────
exports.approveClaim = async (req, res) => {
  try {
    const { id } = req.params
    const claim  = await prisma.claim.findUnique({ where: { id }, include: { user: true } })
    if (!claim) return res.status(404).json({ message: "Claim not found" })
    if (claim.status !== "PENDING")
      return res.status(400).json({ message: "Only pending claims can be approved" })

    const updated = await prisma.claim.update({
      where: { id },
      data:  { status: "APPROVED", reviewedById: req.user.id },
      include: { documents: true },
    })

    await prisma.auditLog.create({
      data: { action: "APPROVE_CLAIM", entity: "Claim", entityId: id, userId: req.user.id }
    }).catch(() => {})

    const notifyData = { fullName: claim.user.fullName, claimType: claim.type, claimTitle: claim.title, amount: claim.amount }
    Promise.allSettled([
      sendClaimApprovedEmail({ email: claim.user.email, ...notifyData }),
      sendClaimApprovedSMS({   phone: claim.user.phone, ...notifyData }),
      prisma.notification.create({
        data: {
          userId:  claim.userId,
          channel: "IN_APP",
          title:   "Claim approved ✓",
          message: `Your ${claim.type} claim "${claim.title}" has been approved.`,
          status:  "SENT",
          sentAt:  new Date(),
        },
      }),
    ])

    console.log("✅ Claim approved:", id)
    res.json({ message: "Claim approved successfully", claim: safeClaimFields(updated) })
  } catch (error) {
    console.error("❌ approveClaim error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ── REJECT CLAIM ──────────────────────────────────────────────────────────────
exports.rejectClaim = async (req, res) => {
  try {
    const { id }     = req.params
    const { reason } = req.body   // rejection reason — optional but encouraged
    const claim      = await prisma.claim.findUnique({ where: { id }, include: { user: true } })
    if (!claim) return res.status(404).json({ message: "Claim not found" })
    if (claim.status !== "PENDING")
      return res.status(400).json({ message: "Only pending claims can be rejected" })

    const updated = await prisma.claim.update({
      where: { id },
      data:  {
        status:          "REJECTED",
        reviewedById:    req.user.id,
        rejectionReason: reason || null,
      },
      include: { documents: true },
    })

    await prisma.auditLog.create({
      data: { action: "REJECT_CLAIM", entity: "Claim", entityId: id, userId: req.user.id }
    }).catch(() => {})

    const notifyData = { fullName: claim.user.fullName, claimType: claim.type, claimTitle: claim.title, reason: reason || null }
    Promise.allSettled([
      sendClaimRejectedEmail({ email: claim.user.email, ...notifyData }),
      sendClaimRejectedSMS({   phone: claim.user.phone, ...notifyData }),
      prisma.notification.create({
        data: {
          userId:  claim.userId,
          channel: "IN_APP",
          title:   "Claim not approved",
          message: `Your ${claim.type} claim "${claim.title}" was not approved.${reason ? ` Reason: ${reason}` : ""}`,
          status:  "SENT",
          sentAt:  new Date(),
        },
      }),
    ])

    console.log("✅ Claim rejected:", id)
    res.json({ message: "Claim rejected", claim: safeClaimFields(updated) })
  } catch (error) {
    console.error("❌ rejectClaim error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ── ADD DOCUMENT ──────────────────────────────────────────────────────────────
exports.addClaimDocument = async (req, res) => {
  try {
    const { id }                     = req.params
    const { url, filename, mimeType } = req.body
    if (!url || !filename)
      return res.status(400).json({ message: "url and filename are required" })

    const claim = await prisma.claim.findUnique({ where: { id } })
    if (!claim) return res.status(404).json({ message: "Claim not found" })
    if (req.user.role === "MEMBER" && claim.userId !== req.user.id)
      return res.status(403).json({ message: "Access denied" })

    // Max 5 documents per claim
    const docCount = await prisma.claimDocument.count({ where: { claimId: id } })
    if (docCount >= 5)
      return res.status(400).json({ message: "Maximum 5 documents per claim" })

    const document = await prisma.claimDocument.create({
      data: { claimId: id, url, filename, mimeType: mimeType || null },
    })

    res.status(201).json({ message: "Document added successfully", document })
  } catch (error) {
    console.error("❌ addClaimDocument error:", error.message)
    res.status(500).json({ error: error.message })
  }
}
