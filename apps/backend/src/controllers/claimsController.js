const prisma = require("../lib/prisma")
const { sendClaimApprovedEmail, sendClaimRejectedEmail } = require("../services/emailService")
const { sendClaimApprovedSMS, sendClaimRejectedSMS } = require("../services/smsService")

// Governance: a claim is approved only when BOTH a Treasurer and a Secretary have approved it.
// Set to false if even the super admin must wait for both.
const SUPER_ADMIN_CAN_OVERRIDE = true

const SLOT = {
  TREASURER: { by: "treasurerApprovedById", at: "treasurerApprovedAt", label: "Treasurer" },
  SECRETARY: { by: "secretaryApprovedById", at: "secretaryApprovedAt", label: "Secretary" },
}
const APPROVAL_KEYS = [
  "treasurerApprovedById", "treasurerApprovedAt", "treasurerApprovedByName",
  "secretaryApprovedById", "secretaryApprovedAt", "secretaryApprovedByName", "overrideApproval",
]

class ClaimError extends Error {
  constructor(status, message) { super(message); this.status = status }
}

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
  treasurerApprovedById:   c.treasurerApprovedById || null,
  treasurerApprovedAt:     c.treasurerApprovedAt || null,
  treasurerApprovedByName: c.treasurerApprovedByName || null,
  secretaryApprovedById:   c.secretaryApprovedById || null,
  secretaryApprovedAt:     c.secretaryApprovedAt || null,
  secretaryApprovedByName: c.secretaryApprovedByName || null,
  overrideApproval:        !!c.overrideApproval,
  user:         c.user         || undefined,
  reviewedBy:   c.reviewedBy   || undefined,
  documents:    c.documents    || [],
  createdAt:    c.createdAt,
  updatedAt:    c.updatedAt,
})

// Members never see who approved internally
const forViewer = (c, role) => {
  if (role !== "MEMBER") return c
  const copy = { ...c }
  APPROVAL_KEYS.forEach((k) => delete copy[k])
  return copy
}

async function attachApprovers(list) {
  const arr = Array.isArray(list) ? list : [list]
  const ids = new Set()
  arr.forEach((c) => {
    if (c.treasurerApprovedById) ids.add(c.treasurerApprovedById)
    if (c.secretaryApprovedById) ids.add(c.secretaryApprovedById)
  })
  if (!ids.size) return
  const users = await prisma.user.findMany({ where: { id: { in: [...ids] } }, select: { id: true, fullName: true } })
  const names = new Map(users.map((u) => [u.id, u.fullName]))
  arr.forEach((c) => {
    c.treasurerApprovedByName = names.get(c.treasurerApprovedById) || null
    c.secretaryApprovedByName = names.get(c.secretaryApprovedById) || null
  })
}

const notifyRoles = async (roles, title, message) => {
  const admins = await prisma.user.findMany({
    where: { role: { in: roles }, isActive: true, accountStatus: "ACTIVE" },
    select: { id: true },
  })
  await Promise.allSettled(
    admins.map((a) => prisma.notification.create({
      data: { userId: a.id, channel: "IN_APP", title, message, status: "SENT", sentAt: new Date() },
    }))
  )
}

const fail = (res, error, label) => {
  if (error instanceof ClaimError) return res.status(error.status).json({ message: error.message })
  console.error(`${label} error:`, error.message)
  return res.status(500).json({ error: error.message })
}

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
    }).catch(e => console.error("Audit log failed:", e.message))

    await notifyRoles(
      ["SUPER_ADMIN", "TREASURER", "SECRETARY"],
      "New claim submitted",
      `A new ${type} claim has been submitted and needs review.`
    )

    res.status(201).json({ message: "Claim submitted successfully", claim: forViewer(safeClaimFields(claim), req.user.role) })
  } catch (error) {
    fail(res, error, "createClaim")
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

    let stats = null
    if (req.user.role !== "MEMBER") {
      await attachApprovers(claims)
      const [pending, approved, rejected, total_all] = await Promise.all([
        prisma.claim.count({ where: { status: "PENDING"  } }),
        prisma.claim.count({ where: { status: "APPROVED" } }),
        prisma.claim.count({ where: { status: "REJECTED" } }),
        prisma.claim.count(),
      ])
      const approvedSum = await prisma.claim.aggregate({ _sum: { amount: true }, where: { status: "APPROVED" } })
      const byType = await Promise.all(
        ["MEDICAL", "DEATH", "DISABILITY", "EDUCATION"].map(async t => ({
          type:   t,
          count:  await prisma.claim.count({ where: { type: t } }),
          amount: (await prisma.claim.aggregate({ _sum: { amount: true }, where: { type: t, status: "APPROVED" } }))._sum.amount || 0,
        }))
      )
      let awaitingMe = pending
      if (SLOT[req.user.role])
        awaitingMe = await prisma.claim.count({ where: { status: "PENDING", [SLOT[req.user.role].by]: null } })
      stats = { pending, approved, rejected, total: total_all, approvedAmount: approvedSum._sum.amount || 0, byType, awaitingMe }
    }

    res.json({
      page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)), stats,
      claims: claims.map((c) => forViewer(c, req.user.role)),
    })
  } catch (error) {
    fail(res, error, "getClaims")
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

    if (req.user.role !== "MEMBER") await attachApprovers(claim)
    res.json({ claim: forViewer(safeClaimFields(claim), req.user.role) })
  } catch (error) {
    fail(res, error, "getClaimById")
  }
}

// ── APPROVE CLAIM (Treasurer + Secretary) ─────────────────────────────────────
exports.approveClaim = async (req, res) => {
  try {
    const { id } = req.params
    const role = req.user.role
    const isOverride = role === "SUPER_ADMIN"
    if (!isOverride && !SLOT[role]) return res.status(403).json({ message: "You cannot approve claims" })
    if (isOverride && !SUPER_ADMIN_CAN_OVERRIDE)
      return res.status(403).json({ message: "Claims are approved by the Treasurer and the Secretary." })

    const result = await prisma.$transaction(async (tx) => {
      const claim = await tx.claim.findUnique({ where: { id }, include: { user: true } })
      if (!claim) throw new ClaimError(404, "Claim not found")
      if (claim.status !== "PENDING") throw new ClaimError(400, "Only pending claims can be approved")

      const data = {}
      if (isOverride) {
        data.overrideApproval = true
      } else {
        const slot = SLOT[role]
        if (claim[slot.by]) throw new ClaimError(400, `The ${slot.label} approval is already recorded for this claim.`)
        data[slot.by] = req.user.id
        data[slot.at] = new Date()
      }
      await tx.claim.update({ where: { id }, data })

      // Re-read inside the transaction: a concurrent approval by the other role is visible here
      const fresh = await tx.claim.findUnique({ where: { id } })
      const complete = fresh.overrideApproval || (fresh.treasurerApprovedById && fresh.secretaryApprovedById)
      if (!complete) return { claim: fresh, owner: claim.user, finalized: false }

      const done = await tx.claim.updateMany({
        where: { id, status: "PENDING" },
        data:  { status: "APPROVED", reviewedById: req.user.id },
      })
      if (done.count === 0) throw new ClaimError(409, "This claim was just updated by someone else. Please refresh.")
      return { claim: await tx.claim.findUnique({ where: { id } }), owner: claim.user, finalized: true }
    }, { maxWait: 10000, timeout: 20000 })

    const { claim, owner, finalized } = result

    const how = isOverride ? "Super admin override approval (final)" : `${SLOT[role].label} approval${finalized ? " (final)" : " (1 of 2)"}`
    prisma.auditLog.create({
      data: { action: "APPROVE_CLAIM", entity: "Claim", entityId: id, userId: req.user.id, details: how },
    }).catch(() => {})

    const full = await prisma.claim.findUnique({ where: { id }, include: { documents: true } })
    await attachApprovers(full)

    if (finalized) {
      const notifyData = { fullName: owner.fullName, claimType: claim.type, claimTitle: claim.title, amount: claim.amount }
      Promise.allSettled([
        sendClaimApprovedEmail({ email: owner.email, ...notifyData }),
        sendClaimApprovedSMS({   phone: owner.phone, ...notifyData }),
        prisma.notification.create({
          data: {
            userId: claim.userId, channel: "IN_APP", title: "Claim approved",
            message: `Your ${claim.type} claim "${claim.title}" has been approved.`, status: "SENT", sentAt: new Date(),
          },
        }),
      ])
      return res.json({ message: "Claim approved. Member notified.", finalized: true, claim: safeClaimFields(full) })
    }

    const waitingFor = claim.treasurerApprovedById ? "SECRETARY" : "TREASURER"
    notifyRoles([waitingFor], "Claim awaiting your approval", `A ${claim.type} claim ("${claim.title}") has one approval and needs yours.`).catch(() => {})
    res.json({
      message: `Your approval is recorded. Waiting for the ${SLOT[waitingFor].label}'s approval.`,
      finalized: false,
      claim: safeClaimFields(full),
    })
  } catch (error) {
    fail(res, error, "approveClaim")
  }
}

// ── REJECT CLAIM (any admin, final) ───────────────────────────────────────────
exports.rejectClaim = async (req, res) => {
  try {
    const { id }     = req.params
    const { reason } = req.body
    const claim      = await prisma.claim.findUnique({ where: { id }, include: { user: true } })
    if (!claim) return res.status(404).json({ message: "Claim not found" })
    if (claim.status !== "PENDING")
      return res.status(400).json({ message: "Only pending claims can be rejected" })

    const done = await prisma.claim.updateMany({
      where: { id, status: "PENDING" },
      data:  { status: "REJECTED", reviewedById: req.user.id, rejectionReason: reason || null },
    })
    if (done.count === 0) return res.status(409).json({ message: "This claim was just updated by someone else. Please refresh." })
    const updated = await prisma.claim.findUnique({ where: { id }, include: { documents: true } })
    await attachApprovers(updated)

    prisma.auditLog.create({
      data: { action: "REJECT_CLAIM", entity: "Claim", entityId: id, userId: req.user.id, details: reason || undefined },
    }).catch(() => {})

    const notifyData = { fullName: claim.user.fullName, claimType: claim.type, claimTitle: claim.title, reason: reason || null }
    Promise.allSettled([
      sendClaimRejectedEmail({ email: claim.user.email, ...notifyData }),
      sendClaimRejectedSMS({   phone: claim.user.phone, ...notifyData }),
      prisma.notification.create({
        data: {
          userId: claim.userId, channel: "IN_APP", title: "Claim not approved",
          message: `Your ${claim.type} claim "${claim.title}" was not approved.${reason ? ` Reason: ${reason}` : ""}`,
          status: "SENT", sentAt: new Date(),
        },
      }),
    ])

    res.json({ message: "Claim rejected", claim: safeClaimFields(updated) })
  } catch (error) {
    fail(res, error, "rejectClaim")
  }
}

// ── ADD DOCUMENT ──────────────────────────────────────────────────────────────
exports.addClaimDocument = async (req, res) => {
  try {
    const { id }                      = req.params
    const { url, filename, mimeType } = req.body
    if (!url || !filename)
      return res.status(400).json({ message: "url and filename are required" })

    const claim = await prisma.claim.findUnique({ where: { id } })
    if (!claim) return res.status(404).json({ message: "Claim not found" })
    if (req.user.role === "MEMBER" && claim.userId !== req.user.id)
      return res.status(403).json({ message: "Access denied" })

    const docCount = await prisma.claimDocument.count({ where: { claimId: id } })
    if (docCount >= 5)
      return res.status(400).json({ message: "Maximum 5 documents per claim" })

    const document = await prisma.claimDocument.create({
      data: { claimId: id, url, filename, mimeType: mimeType || null },
    })

    res.status(201).json({ message: "Document added successfully", document })
  } catch (error) {
    fail(res, error, "addClaimDocument")
  }
}
