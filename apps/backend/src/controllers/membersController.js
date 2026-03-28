/**
 * controllers/membersController.js  (optimized)
 * ─────────────────────────────────────────────────────────────────────────────
 * Changes vs original:
 *  • getMembers      — cache-aside with 5-min TTL, keyed on full query string
 *  • getMemberById   — cache-aside with 10-min TTL, keyed on member id
 *  • createMember    — invalidates members:* + dashboard:* on success
 *  • updateMember    — invalidates specific detail key + members list keys
 *  • deleteMember    — invalidates specific detail key + members list keys
 *  • activate/deactivate/anonymise/sendResetLink — each busts member cache
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { v4: uuidv4 } = require("uuid")
const prisma          = require("../lib/prisma")
const {
  sendActivationEmail,
  sendPasswordResetEmail,
  sendAccountStatusEmail,
} = require("../services/emailService")
const bcrypt = require("bcrypt")
const {
  cacheDel,
  cacheGet,
  cacheSet,
  cacheInvalidatePattern,
  TTL,
  keys,
} = require("../lib/redis")

// ─── Helpers ───────────────────────────────────────────────────────────────────
const generateMemberNumber = () => {
  const year   = new Date().getFullYear()
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, "0")
  return `MBR-${year}-${random}`
}

const safeMemberFields = (user) => ({
  id:                user.id,
  fullName:          user.fullName,
  email:             user.email,
  phone:             user.phone,
  nationalId:        user.nationalId,
  memberNumber:      user.memberNumber,
  role:              user.role,
  isActive:          user.isActive,
  accountStatus:     user.accountStatus    || "ACTIVE",
  deactivatedAt:     user.deactivatedAt    || null,
  anonymisedAt:      user.anonymisedAt     || null,
  groupId:           user.groupId,
  memberType:        user.memberType        || "SINGLE",
  monthlyRate:       user.monthlyRate       || (user.memberType === "FAMILY" ? 500 : 200),
  annualRate:        (user.monthlyRate      || (user.memberType === "FAMILY" ? 500 : 200)) * 12,
  loanEligible:      user.loanEligible      || false,
  loanLimitOverride: user.loanLimitOverride || null,
  profilePhoto:      user.profilePhoto      || null,
  createdByAdminId:  user.createdByAdminId,
  createdAt:         user.createdAt,
  updatedAt:         user.updatedAt,
})

// Helper — build a stable cache key from the request query params
const buildListCacheKey = (query) => {
  const { page = 1, limit = 10, search = "", isActive, include, accountStatus } = query
  return keys.membersList(
    `p${page}_l${limit}_s${search}_ia${isActive || ""}_as${accountStatus || ""}_inc${include || ""}`
  )
}

// ─── CREATE MEMBER ─────────────────────────────────────────────────────────────
exports.createMember = async (req, res) => {
  try {
    const { fullName, email, phone, nationalId, groupId, memberType } = req.body

    if (!fullName || !email) {
      return res.status(400).json({ message: "fullName and email are required" })
    }

    const existingEmail = await prisma.user.findUnique({ where: { email } })
    if (existingEmail) return res.status(400).json({ message: "Email already registered" })

    if (nationalId) {
      const existingId = await prisma.user.findUnique({ where: { nationalId } })
      if (existingId) return res.status(400).json({ message: "National ID already registered" })
    }

    // Ensure unique member number
    let memberNumber = generateMemberNumber()
    let attempts     = 0
    while (await prisma.user.findUnique({ where: { memberNumber } }) && attempts < 10) {
      memberNumber = generateMemberNumber()
      attempts++
    }

    const activationToken = uuidv4()
    const resolvedType    = memberType || "SINGLE"
    const monthlyRate     = resolvedType === "FAMILY" ? 500 : 200

    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        phone:            phone      || null,
        nationalId:       nationalId || null,
        memberNumber,
        role:             "MEMBER",
        memberType:       resolvedType,
        monthlyRate,
        activationToken,
        isActive:         false,
        accountStatus:    "ACTIVE",
        groupId:          groupId || null,
        createdByAdminId: req.user?.id || null,
      },
    })

    console.log("✅ Member created:", user.id)

    try {
      await sendActivationEmail(email, activationToken)
      console.log("✅ Activation email sent to:", email)
    } catch (emailError) {
      console.error("❌ Email failed, rolling back:", emailError.message)
      await prisma.user.delete({ where: { id: user.id } })
      return res.status(500).json({ message: "Failed to send activation email. Please try again." })
    }

    // ── Invalidate all member list caches and dashboard ──────────────────────
    await Promise.all([
      cacheInvalidatePattern("members:list:*"),
      cacheInvalidatePattern("dashboard:*"),
    ])

    if (req.user?.id) {
      await prisma.auditLog.create({
        data: { action: "CREATE_MEMBER", entity: "User", entityId: user.id, userId: req.user.id },
      }).catch(e => console.error("⚠️ Audit log failed:", e.message))
    }

    res.status(201).json({
      message: "Member created successfully. Activation email sent.",
      member:  safeMemberFields(user),
    })

  } catch (error) {
    console.error("❌ createMember error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ─── GET ALL MEMBERS ───────────────────────────────────────────────────────────
exports.getMembers = async (req, res) => {
  try {
    const {
      page = 1, limit = 10, search = "",
      isActive, include, accountStatus,
    } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)

    const cacheKey    = buildListCacheKey(req.query)
    const isCacheable = !include || include === "group"

    // ── Cache-aside: check Redis first ───────────────────────────────────────
    if (isCacheable) {
      const cached = await cacheGet(cacheKey)
      if (cached) {
        console.log("⚡ Cache HIT:", cacheKey)
        return res.json(cached)
      }
    }

    // ── Build where clause ───────────────────────────────────────────────────
    const whereClause = {
      role: "MEMBER",
      ...(isActive !== undefined && { isActive: isActive === "true" }),
      ...(accountStatus && { accountStatus }),
      OR: [
        { fullName:     { contains: search, mode: "insensitive" } },
        { email:        { contains: search, mode: "insensitive" } },
        { memberNumber: { contains: search, mode: "insensitive" } },
        { nationalId:   { contains: search, mode: "insensitive" } },
      ],
    }

    const withContributions = include === "contributions" || include === "all"
    const withGroup         = include === "group" || include === "all" || !include || include === "contributions"

    let queryOptions

    if (withContributions || withGroup) {
      queryOptions = {
        where:   whereClause,
        skip,
        take:    parseInt(limit),
        orderBy: { createdAt: "desc" },
        include: {
          ...(withGroup && {
            group: { select: { id: true, name: true } },
          }),
          ...(withContributions && {
            contributions: {
              where:  { type: "MONTHLY" },
              select: {
                id:        true,
                amount:    true,
                type:      true,
                period:    true,
                paid:      true,
                status:    true,
                createdAt: true,
                updatedAt: true,
              },
            },
          }),
        },
      }
    } else {
      queryOptions = {
        where:   whereClause,
        skip,
        take:    parseInt(limit),
        orderBy: { createdAt: "desc" },
        select: {
          id:                true,
          fullName:          true,
          email:             true,
          phone:             true,
          nationalId:        true,
          memberNumber:      true,
          role:              true,
          isActive:          true,
          accountStatus:     true,
          deactivatedAt:     true,
          anonymisedAt:      true,
          groupId:           true,
          memberType:        true,
          monthlyRate:       true,
          loanEligible:      true,
          loanLimitOverride: true,
          createdByAdminId:  true,
          createdAt:         true,
          updatedAt:         true,
        },
      }
    }

    const [members, total] = await Promise.all([
      prisma.user.findMany(queryOptions),
      prisma.user.count({ where: whereClause }),
    ])

    const safeMembers = members.map((m) => {
      const { password, activationToken, resetToken, resetTokenExpiry, ...safe } = m
      return safe
    })

    const response = {
      page:       parseInt(page),
      limit:      parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      members:    safeMembers,
    }

    // ── Populate cache on miss ────────────────────────────────────────────────
    if (isCacheable) {
      await cacheSet(cacheKey, response, TTL.MEMBERS_LIST)
      console.log("💾 Cache SET:", cacheKey)
    }

    res.json(response)

  } catch (error) {
    console.error("❌ getMembers error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ─── GET SINGLE MEMBER ─────────────────────────────────────────────────────────
exports.getMemberById = async (req, res) => {
  try {
    const { id } = req.params

    // ── Cache-aside ──────────────────────────────────────────────────────────
    const cacheKey = keys.memberDetail(id)
    const cached   = await cacheGet(cacheKey)

    if (cached) {
      console.log("⚡ Cache HIT:", cacheKey)
      // Still enforce access control even on cache hit
      if (
        req.user.id !== id &&
        !["SUPER_ADMIN", "TREASURER", "SECRETARY"].includes(req.user.role)
      ) {
        return res.status(403).json({ message: "Access denied" })
      }
      return res.json({ member: cached })
    }

    const member = await prisma.user.findUnique({
      where:   { id },
      include: {
        group:          { select: { id: true, name: true } },
        createdByAdmin: { select: { id: true, fullName: true, email: true } },
        dependents:     true,
      },
    })

    if (!member || member.role !== "MEMBER") {
      return res.status(404).json({ message: "Member not found" })
    }

    if (req.user.id !== id && !["SUPER_ADMIN", "TREASURER", "SECRETARY"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" })
    }

    const safeData = {
      ...safeMemberFields(member),
      group:      member.group,
      dependents: member.dependents || [],
    }

    // ── Populate cache ───────────────────────────────────────────────────────
    await cacheSet(cacheKey, safeData, TTL.MEMBER_DETAIL)
    console.log("💾 Cache SET:", cacheKey)

    res.json({ member: safeData })

  } catch (error) {
    console.error("❌ getMemberById error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ─── UPDATE MEMBER ─────────────────────────────────────────────────────────────
exports.updateMember = async (req, res) => {
  try {
    const { id } = req.params
    const { fullName, email, phone, nationalId, groupId, memberType, password } = req.body

    if (req.user.id !== id && !["SUPER_ADMIN", "TREASURER", "SECRETARY"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" })
    }

    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing || existing.role !== "MEMBER") {
      return res.status(404).json({ message: "Member not found" })
    }

    if (email && email !== existing.email) {
      const emailTaken = await prisma.user.findUnique({ where: { email } })
      if (emailTaken) return res.status(400).json({ message: "Email already registered to another member" })
    }

    if (nationalId && nationalId !== existing.nationalId) {
      const idTaken = await prisma.user.findUnique({ where: { nationalId } })
      if (idTaken) return res.status(400).json({ message: "National ID already registered" })
    }

    const updateData = {}
    if (fullName)              updateData.fullName   = fullName
    if (email)                 updateData.email      = email
    if (phone)                 updateData.phone      = phone
    if (nationalId)            updateData.nationalId = nationalId
    if (groupId !== undefined) updateData.groupId    = groupId || null

    if (memberType) {
      updateData.memberType  = memberType
      updateData.monthlyRate = memberType === "FAMILY" ? 500 : 200
    }

    if (password) {
      if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters" })
      const salt          = await bcrypt.genSalt(10)
      updateData.password = await bcrypt.hash(password, salt)
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No valid fields provided to update" })
    }

    const updated = await prisma.user.update({ where: { id }, data: updateData })

    // ── Invalidate this member's detail cache + all list caches ─────────────
    await Promise.all([
      cacheDel(keys.memberDetail(id)),
      cacheInvalidatePattern("members:list:*"),
      cacheInvalidatePattern("dashboard:*"),
    ])

    await prisma.auditLog.create({
      data: { action: "UPDATE_MEMBER", entity: "User", entityId: id, userId: req.user.id },
    }).catch(e => console.error("⚠️ Audit log failed:", e.message))

    console.log("✅ Member updated:", id)
    res.json({ message: "Member updated successfully", member: safeMemberFields(updated) })

  } catch (error) {
    console.error("❌ updateMember error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ─── DELETE MEMBER ─────────────────────────────────────────────────────────────
exports.deleteMember = async (req, res) => {
  try {
    const { id } = req.params

    const member = await prisma.user.findUnique({ where: { id } })
    if (!member || member.role !== "MEMBER") {
      return res.status(404).json({ message: "Member not found" })
    }

    await prisma.user.delete({ where: { id } })

    // ── Bust detail + all list pages ─────────────────────────────────────────
    await Promise.all([
      cacheDel(keys.memberDetail(id)),
      cacheInvalidatePattern("members:list:*"),
      cacheInvalidatePattern("dashboard:*"),
    ])

    if (req.user?.id) {
      await prisma.auditLog.create({
        data: { action: "DELETE_MEMBER", entity: "User", entityId: id, userId: req.user.id },
      }).catch(e => console.error("⚠️ Audit log failed:", e.message))
    }

    console.log("✅ Member deleted:", id)
    res.json({ message: "Member deleted successfully" })

  } catch (error) {
    console.error("❌ deleteMember error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ─── ACTIVATE MEMBER ──────────────────────────────────────────────────────────
exports.activateMember = async (req, res) => {
  try {
    const { id } = req.params

    const member = await prisma.user.findUnique({ where: { id } })
    if (!member || member.role !== "MEMBER") {
      return res.status(404).json({ message: "Member not found" })
    }

    if (member.accountStatus === "ANONYMISED") {
      return res.status(400).json({ message: "Anonymised accounts cannot be reactivated" })
    }

    if (member.accountStatus === "ACTIVE" && member.isActive) {
      return res.status(400).json({ message: "Member account is already active" })
    }

    const updated = await prisma.user.update({
      where: { id },
      data:  { accountStatus: "ACTIVE", isActive: true, deactivatedAt: null },
    })

    await Promise.all([
      cacheDel(keys.memberDetail(id)),
      cacheInvalidatePattern("members:list:*"),
    ])

    await prisma.auditLog.create({
      data: { action: "ACTIVATE_MEMBER", entity: "User", entityId: id, userId: req.user.id },
    }).catch(e => console.error("⚠️ Audit log failed:", e.message))

    try {
      await sendAccountStatusEmail({ email: member.email, fullName: member.fullName, status: "ACTIVE" })
    } catch (emailError) {
      console.error("⚠️ Status email failed (non-fatal):", emailError.message)
    }

    console.log("✅ Member activated:", id)
    res.json({ message: "Member account activated successfully", member: safeMemberFields(updated) })

  } catch (error) {
    console.error("❌ activateMember error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ─── DEACTIVATE MEMBER ────────────────────────────────────────────────────────
exports.deactivateMember = async (req, res) => {
  try {
    const { id } = req.params

    const member = await prisma.user.findUnique({ where: { id } })
    if (!member || member.role !== "MEMBER") {
      return res.status(404).json({ message: "Member not found" })
    }

    if (member.accountStatus === "ANONYMISED") {
      return res.status(400).json({ message: "Anonymised accounts cannot be deactivated" })
    }

    if (member.accountStatus === "INACTIVE") {
      return res.status(400).json({ message: "Member account is already inactive" })
    }

    const updated = await prisma.user.update({
      where: { id },
      data:  { accountStatus: "INACTIVE", isActive: false, deactivatedAt: new Date() },
    })

    await Promise.all([
      cacheDel(keys.memberDetail(id)),
      cacheInvalidatePattern("members:list:*"),
    ])

    await prisma.auditLog.create({
      data: { action: "DEACTIVATE_MEMBER", entity: "User", entityId: id, userId: req.user.id },
    }).catch(e => console.error("⚠️ Audit log failed:", e.message))

    try {
      await sendAccountStatusEmail({ email: member.email, fullName: member.fullName, status: "INACTIVE" })
    } catch (emailError) {
      console.error("⚠️ Status email failed (non-fatal):", emailError.message)
    }

    console.log("✅ Member deactivated:", id)
    res.json({ message: "Member account deactivated successfully", member: safeMemberFields(updated) })

  } catch (error) {
    console.error("❌ deactivateMember error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ─── ANONYMISE MEMBER ─────────────────────────────────────────────────────────
exports.anonymiseMember = async (req, res) => {
  try {
    const { id } = req.params

    const member = await prisma.user.findUnique({ where: { id } })
    if (!member || member.role !== "MEMBER") {
      return res.status(404).json({ message: "Member not found" })
    }

    if (member.accountStatus === "ANONYMISED") {
      return res.status(400).json({ message: "Member account is already anonymised" })
    }

    const realEmail    = member.email
    const realFullName = member.fullName
    const anonSuffix   = id.slice(0, 8)

    const updated = await prisma.user.update({
      where: { id },
      data:  {
        fullName:         `Anonymised_${anonSuffix}`,
        email:            `anon_${anonSuffix}@deleted.local`,
        phone:            null,
        nationalId:       null,
        profilePhoto:     null,
        accountStatus:    "ANONYMISED",
        isActive:         false,
        password:         null,
        activationToken:  null,
        resetToken:       null,
        resetTokenExpiry: null,
        anonymisedAt:     new Date(),
        deactivatedAt:    new Date(),
      },
    })

    // ── Bust all caches for this member immediately ──────────────────────────
    await Promise.all([
      cacheDel(keys.memberDetail(id)),
      cacheInvalidatePattern("members:list:*"),
      cacheInvalidatePattern("dashboard:*"),
    ])

    await prisma.auditLog.create({
      data: { action: "ANONYMISE_MEMBER", entity: "User", entityId: id, userId: req.user.id },
    }).catch(e => console.error("⚠️ Audit log failed:", e.message))

    try {
      await sendAccountStatusEmail({ email: realEmail, fullName: realFullName, status: "ANONYMISED" })
    } catch (emailError) {
      console.error("⚠️ Anonymisation email failed (non-fatal):", emailError.message)
    }

    console.log("✅ Member anonymised:", id)
    res.json({ message: "Member account anonymised successfully", member: safeMemberFields(updated) })

  } catch (error) {
    console.error("❌ anonymiseMember error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ─── SEND PASSWORD RESET LINK ─────────────────────────────────────────────────
exports.sendResetLink = async (req, res) => {
  try {
    const { id } = req.params

    const member = await prisma.user.findUnique({ where: { id } })
    if (!member || member.role !== "MEMBER") {
      return res.status(404).json({ message: "Member not found" })
    }

    if (member.accountStatus === "ANONYMISED") {
      return res.status(400).json({ message: "Cannot send reset link to an anonymised account" })
    }

    if (member.accountStatus === "INACTIVE") {
      return res.status(400).json({ message: "Cannot send reset link to an inactive account. Activate the account first." })
    }

    const resetToken       = uuidv4()
    const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await prisma.user.update({ where: { id }, data: { resetToken, resetTokenExpiry } })

    try {
      await sendPasswordResetEmail({ email: member.email, fullName: member.fullName, token: resetToken })
    } catch (emailError) {
      await prisma.user.update({ where: { id }, data: { resetToken: null, resetTokenExpiry: null } })
      console.error("❌ Reset email failed:", emailError.message)
      return res.status(500).json({ message: "Failed to send password reset email. Please try again." })
    }

    // ── Bust detail cache since resetToken/Expiry changed ────────────────────
    await cacheDel(keys.memberDetail(id))

    await prisma.auditLog.create({
      data: { action: "SEND_RESET_LINK", entity: "User", entityId: id, userId: req.user.id },
    }).catch(e => console.error("⚠️ Audit log failed:", e.message))

    console.log("✅ Password reset link sent for member:", id)
    res.json({ message: `Password reset link sent to ${member.email}` })

  } catch (error) {
    console.error("❌ sendResetLink error:", error.message)
    res.status(500).json({ error: error.message })
  }
}