const { v4: uuidv4 } = require("uuid")
const prisma          = require("../lib/prisma")
const {
  sendActivationEmail,
  sendPasswordResetEmail,
  sendAccountStatusEmail,
} = require("../services/emailService")
const bcrypt = require("bcrypt")

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
    const { page = 1, limit = 10, search = "", isActive, include, accountStatus } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)

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

    res.json({
      page:       parseInt(page),
      limit:      parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      members:    safeMembers,
    })

  } catch (error) {
    console.error("❌ getMembers error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ─── GET SINGLE MEMBER ─────────────────────────────────────────────────────────
exports.getMemberById = async (req, res) => {
  try {
    const { id } = req.params

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

    res.json({
      member: {
        ...safeMemberFields(member),
        group:      member.group,
        dependents: member.dependents || [],
      },
    })

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
// POST /api/members/:id/activate
// Super admin re-enables a previously deactivated account.
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
      data:  {
        accountStatus: "ACTIVE",
        isActive:      true,
        deactivatedAt: null,
      },
    })

    await prisma.auditLog.create({
      data: { action: "ACTIVATE_MEMBER", entity: "User", entityId: id, userId: req.user.id },
    }).catch(e => console.error("⚠️ Audit log failed:", e.message))

    // Notify member
    try {
      await sendAccountStatusEmail({
        email:    member.email,
        fullName: member.fullName,
        status:   "ACTIVE",
      })
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
// POST /api/members/:id/deactivate
// Soft-disables the account — member cannot log in but all data is retained.
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
      data:  {
        accountStatus: "INACTIVE",
        isActive:      false,
        deactivatedAt: new Date(),
      },
    })

    await prisma.auditLog.create({
      data: { action: "DEACTIVATE_MEMBER", entity: "User", entityId: id, userId: req.user.id },
    }).catch(e => console.error("⚠️ Audit log failed:", e.message))

    // Notify member
    try {
      await sendAccountStatusEmail({
        email:    member.email,
        fullName: member.fullName,
        status:   "INACTIVE",
      })
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
// POST /api/members/:id/anonymise
// ⚠️  IRREVERSIBLE — replaces all PII with anonymised values.
// Use only upon verified member request (GDPR / data privacy compliance).
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

    // Capture real email before we wipe it — needed to send the final notification
    const realEmail    = member.email
    const realFullName = member.fullName

    const anonSuffix = id.slice(0, 8)

    const updated = await prisma.user.update({
      where: { id },
      data:  {
        // ── Replace all PII ──────────────────────────────────────────────
        fullName:      `Anonymised_${anonSuffix}`,
        email:         `anon_${anonSuffix}@deleted.local`,
        phone:         null,
        nationalId:    null,
        profilePhoto:  null,
        // ── Lock the account ─────────────────────────────────────────────
        accountStatus: "ANONYMISED",
        isActive:      false,
        password:      null,
        activationToken: null,
        resetToken:    null,
        resetTokenExpiry: null,
        anonymisedAt:  new Date(),
        deactivatedAt: new Date(),
      },
    })

    await prisma.auditLog.create({
      data: { action: "ANONYMISE_MEMBER", entity: "User", entityId: id, userId: req.user.id },
    }).catch(e => console.error("⚠️ Audit log failed:", e.message))

    // Send final notification to the real email before it is gone
    try {
      await sendAccountStatusEmail({
        email:    realEmail,
        fullName: realFullName,
        status:   "ANONYMISED",
      })
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
// POST /api/members/:id/send-reset-link
// Super admin triggers a password reset email on behalf of a member.
// Generates a fresh signed token valid for 24 hours (single-use).
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
    const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    await prisma.user.update({
      where: { id },
      data:  { resetToken, resetTokenExpiry },
    })

    try {
      await sendPasswordResetEmail({
        email:    member.email,
        fullName: member.fullName,
        token:    resetToken,
      })
    } catch (emailError) {
      // Roll back token on email failure so it can be retried cleanly
      await prisma.user.update({
        where: { id },
        data:  { resetToken: null, resetTokenExpiry: null },
      })
      console.error("❌ Reset email failed:", emailError.message)
      return res.status(500).json({ message: "Failed to send password reset email. Please try again." })
    }

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
