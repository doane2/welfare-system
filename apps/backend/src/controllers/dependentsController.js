const prisma = require("../lib/prisma")
const nodemailer = require("nodemailer")
require("dotenv").config()

// ── Validation rules per dependent type ──────────────────
const DEPENDENT_RULES = {
  CHILD_UNDER_18: {
    label:            "Child (under 18)",
    requiresBirthCert: true,
    requiresNationalId: false,
    maxAge:           17,
    minAge:           0,
  },
  CHILD_18_25: {
    label:            "Child (18–25)",
    requiresBirthCert: false,
    requiresNationalId: true,
    maxAge:           25,
    minAge:           18,
  },
  PARENT: {
    label:            "Parent",
    requiresBirthCert: false,
    requiresNationalId: true,
    maxAge:           null,
    minAge:           null,
  },
  SIBLING: {
    label:            "Sibling",
    requiresBirthCert: false,
    requiresNationalId: true,
    maxAge:           null,
    minAge:           null,
  },
  NEXT_OF_KIN: {
    label:            "Next of kin",
    requiresBirthCert: false,
    requiresNationalId: true,
    maxAge:           null,
    minAge:           null,
    requiresPhone:    true,
  },
}

// ── Calculate age from DOB ────────────────────────────────
const calcAge = (dob) => {
  if (!dob) return null
  const today  = new Date()
  const birth  = new Date(dob)
  let age      = today.getFullYear() - birth.getFullYear()
  const m      = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

// ── Send notification email to admin / member ─────────────
const notifyDependentAdded = async ({ memberEmail, memberName, dependentName, dependentType }) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com", port: 465, secure: true, family: 4,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    })
    await transporter.sendMail({
      from:    `"Crater SDA Welfare" <${process.env.EMAIL_USER}>`,
      to:      memberEmail,
      subject: `Dependent Added: ${dependentName}`,
      text:    `Hello ${memberName},\n\nA dependent has been added to your welfare account:\n\nName: ${dependentName}\nType: ${DEPENDENT_RULES[dependentType]?.label || dependentType}\n\nIf this was not authorized, please contact your welfare administrator immediately.\n\nCrater SDA Welfare Team`,
    })
    console.log(`✅ Dependent notification sent to ${memberEmail}`)
  } catch (e) {
    console.error("⚠️ Dependent notification email failed:", e.message)
  }
}

// ── GET /api/dependents/member/:memberId ──────────────────
exports.getDependents = async (req, res) => {
  try {
    const { memberId } = req.params

    // Members can only see their own dependents
    if (req.user.role === "MEMBER" && req.user.id !== memberId) {
      return res.status(403).json({ message: "Access denied" })
    }

    const dependents = await prisma.dependent.findMany({
      where:   { memberId },
      orderBy: { createdAt: "asc" },
    })

    res.json({ dependents })
  } catch (error) {
    console.error("❌ getDependents error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ── POST /api/dependents/member/:memberId ─────────────────
exports.addDependent = async (req, res) => {
  try {
    const { memberId } = req.params
    const {
      fullName,
      type,
      dateOfBirth,
      nationalId,
      birthCertNumber,
      phone,
      relationship,
    } = req.body

    if (!fullName || !type) {
      return res.status(400).json({ message: "fullName and type are required" })
    }

    const rules = DEPENDENT_RULES[type]
    if (!rules) {
      return res.status(400).json({ message: `Invalid dependent type. Must be one of: ${Object.keys(DEPENDENT_RULES).join(", ")}` })
    }

    // Verify member exists
    const member = await prisma.user.findUnique({ where: { id: memberId } })
    if (!member) return res.status(404).json({ message: "Member not found" })

    // Age validation
    if (dateOfBirth) {
      const age = calcAge(dateOfBirth)
      if (rules.minAge !== null && age < rules.minAge) {
        return res.status(400).json({ message: `${rules.label} must be at least ${rules.minAge} years old` })
      }
      if (rules.maxAge !== null && age > rules.maxAge) {
        return res.status(400).json({ message: `${rules.label} must be ${rules.maxAge} years old or younger` })
      }
    }

    // Document validation
    if (rules.requiresBirthCert && !birthCertNumber) {
      return res.status(400).json({ message: `Birth certificate number is required for ${rules.label}` })
    }
    if (rules.requiresNationalId && !nationalId) {
      return res.status(400).json({ message: `National ID is required for ${rules.label}` })
    }
    if (rules.requiresPhone && !phone) {
      return res.status(400).json({ message: `Phone number is required for ${rules.label}` })
    }

    const dependent = await prisma.dependent.create({
      data: {
        fullName,
        type,
        dateOfBirth:     dateOfBirth ? new Date(dateOfBirth) : null,
        nationalId:      nationalId || null,
        birthCertNumber: birthCertNumber || null,
        phone:           phone || null,
        relationship:    relationship || null,
        memberId,
        addedById:       req.user.id,
        notified:        false,
      },
    })

    // Update member type to FAMILY if adding child/parent/sibling — also update monthlyRate
    if (["CHILD_UNDER_18", "CHILD_18_25", "PARENT", "SIBLING"].includes(type)) {
      await prisma.user.update({
        where: { id: memberId },
        data:  { memberType: "FAMILY", monthlyRate: 500 },
      })
      console.log(`✅ Member ${memberId} upgraded to FAMILY — monthly rate set to KES 500`)
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        action:   "ADD_DEPENDENT",
        entity:   "Dependent",
        entityId: dependent.id,
        userId:   req.user.id,
      },
    }).catch(() => {})

    // Notify member via email
    notifyDependentAdded({
      memberEmail:   member.email,
      memberName:    member.fullName,
      dependentName: fullName,
      dependentType: type,
    })

    // Mark notified
    await prisma.dependent.update({
      where: { id: dependent.id },
      data:  { notified: true },
    }).catch(() => {})

    // In-app notification for member
    await prisma.notification.create({
      data: {
        userId:  memberId,
        channel: "IN_APP",
        title:   "Dependent Added",
        message: `${fullName} (${rules.label}) has been added to your welfare account.`,
        status:  "SENT",
      },
    }).catch(() => {})

    console.log(`✅ Dependent added: ${fullName} for member ${member.memberNumber}`)

    res.status(201).json({
      message:   "Dependent added successfully",
      dependent,
    })
  } catch (error) {
    console.error("❌ addDependent error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ── PUT /api/dependents/:id ────────────────────────────────
exports.updateDependent = async (req, res) => {
  try {
    const { id } = req.params
    const { fullName, dateOfBirth, nationalId, birthCertNumber, phone, relationship } = req.body

    const existing = await prisma.dependent.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ message: "Dependent not found" })

    const updateData = {}
    if (fullName)         updateData.fullName         = fullName
    if (dateOfBirth)      updateData.dateOfBirth      = new Date(dateOfBirth)
    if (nationalId)       updateData.nationalId       = nationalId
    if (birthCertNumber)  updateData.birthCertNumber  = birthCertNumber
    if (phone)            updateData.phone            = phone
    if (relationship)     updateData.relationship     = relationship

    const updated = await prisma.dependent.update({ where: { id }, data: updateData })

    await prisma.auditLog.create({
      data: { action: "UPDATE_DEPENDENT", entity: "Dependent", entityId: id, userId: req.user.id }
    }).catch(() => {})

    res.json({ message: "Dependent updated", dependent: updated })
  } catch (error) {
    console.error("❌ updateDependent error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ── DELETE /api/dependents/:id ────────────────────────────
exports.removeDependent = async (req, res) => {
  try {
    const { id } = req.params

    const existing = await prisma.dependent.findUnique({
      where:   { id },
      include: { member: true },
    })
    if (!existing) return res.status(404).json({ message: "Dependent not found" })

    await prisma.dependent.delete({ where: { id } })

    // Check if member has any remaining family dependents
    const remaining = await prisma.dependent.count({
      where: {
        memberId: existing.memberId,
        type:     { in: ["CHILD_UNDER_18", "CHILD_18_25", "PARENT", "SIBLING"] },
      },
    })
    if (remaining === 0) {
      await prisma.user.update({
        where: { id: existing.memberId },
        data:  { memberType: "SINGLE", monthlyRate: 200 },
      })
      console.log(`✅ Member ${existing.memberId} downgraded to SINGLE — monthly rate set to KES 200`)
    }

    await prisma.auditLog.create({
      data: { action: "REMOVE_DEPENDENT", entity: "Dependent", entityId: id, userId: req.user.id }
    }).catch(() => {})

    console.log(`✅ Dependent removed: ${existing.fullName}`)
    res.json({ message: "Dependent removed successfully" })
  } catch (error) {
    console.error("❌ removeDependent error:", error.message)
    res.status(500).json({ error: error.message })
  }
}
