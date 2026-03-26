const prisma = require("../lib/prisma")
const {
  sendBeneficiaryRequestReceivedEmail,
  sendBeneficiaryRequestProcessedEmail,
  sendBeneficiaryRequestProcessedSMS,
} = require("../services/emailService")

const DEPENDENT_RULES = {
  CHILD_UNDER_18: { label: "Child (under 18)", requiresBirthCert: true,  requiresNationalId: false, requiresPhone: false },
  CHILD_18_25:    { label: "Child (18–25)",     requiresBirthCert: false, requiresNationalId: true,  requiresPhone: false },
  PARENT:         { label: "Parent",            requiresBirthCert: false, requiresNationalId: true,  requiresPhone: false },
  SIBLING:        { label: "Sibling",           requiresBirthCert: false, requiresNationalId: true,  requiresPhone: false },
  NEXT_OF_KIN:    { label: "Next of kin",       requiresBirthCert: false, requiresNationalId: true,  requiresPhone: true  },
}

// ── GET /api/beneficiary-requests ────────────────────────────────────────────
exports.getRequests = async (req, res) => {
  try {
    const { memberId, status, page = 1, limit = 50 } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)

    const where = {
      ...(req.user.role === "MEMBER" ? { memberId: req.user.id } : {}),
      ...(memberId && req.user.role !== "MEMBER" ? { memberId } : {}),
      ...(status ? { status } : {}),
    }

    const [requests, total] = await Promise.all([
      prisma.beneficiaryRequest.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: "desc" },
        include: {
          member:      { select: { id: true, fullName: true, memberNumber: true, email: true, phone: true } },
          processedBy: { select: { id: true, fullName: true } },
        },
      }),
      prisma.beneficiaryRequest.count({ where }),
    ])

    res.json({ requests, total, page: parseInt(page) })
  } catch (error) {
    console.error("❌ getRequests error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ── POST /api/beneficiary-requests ───────────────────────────────────────────
exports.createRequest = async (req, res) => {
  try {
    const {
      type, dependentId, dependentType,
      fullName, dateOfBirth, nationalId,
      birthCertNumber, phone, relationship, notes,
    } = req.body

    if (!type || !["ADD", "UPDATE", "REMOVE"].includes(type))
      return res.status(400).json({ message: "type must be ADD, UPDATE, or REMOVE" })
    if (type === "ADD" && !fullName)
      return res.status(400).json({ message: "fullName is required for ADD requests" })
    if (type === "ADD" && !dependentType)
      return res.status(400).json({ message: "dependentType is required for ADD requests" })
    if ((type === "UPDATE" || type === "REMOVE") && !dependentId)
      return res.status(400).json({ message: "dependentId is required for UPDATE/REMOVE requests" })

    if (dependentId) {
      const dep = await prisma.dependent.findUnique({ where: { id: dependentId } })
      if (!dep) return res.status(404).json({ message: "Dependent not found" })
      if (dep.memberId !== req.user.id) return res.status(403).json({ message: "Access denied" })
    }

    const request = await prisma.beneficiaryRequest.create({
      data: {
        type,
        memberId:        req.user.id,
        dependentId:     dependentId     || null,
        dependentType:   dependentType   || null,
        fullName:        fullName        || null,
        dateOfBirth:     dateOfBirth     ? new Date(dateOfBirth) : null,
        nationalId:      nationalId      || null,
        birthCertNumber: birthCertNumber || null,
        phone:           phone           || null,
        relationship:    relationship    || null,
        notes:           notes           || null,
      },
      include: {
        member: { select: { id: true, fullName: true, memberNumber: true, email: true, phone: true } },
      },
    })

    // ── Respond immediately so UI never waits on email ────────────────────
    res.status(201).json({ message: "Request submitted successfully", request })

    // Everything below is fire-and-forget — a failure here never affects the response
    const admins = await prisma.user.findMany({
      where:  { role: { in: ["SUPER_ADMIN", "SECRETARY"] }, isActive: true },
      select: { id: true },
    })
    Promise.allSettled(
      admins.map(a =>
        prisma.notification.create({
          data: {
            userId:  a.id,
            channel: "IN_APP",
            title:   `Beneficiary ${type} request`,
            message: `${request.member.fullName} (${request.member.memberNumber}) submitted a beneficiary ${type.toLowerCase()} request.`,
            status:  "SENT",
            sentAt:  new Date(),
          },
        })
      )
    )

    prisma.notification.create({
      data: {
        userId:  req.user.id,
        channel: "IN_APP",
        title:   `Beneficiary ${type.toLowerCase()} request submitted`,
        message: `Your request to ${type.toLowerCase()} a beneficiary has been received and will be processed within 2 working days.`,
        status:  "SENT",
        sentAt:  new Date(),
      },
    }).catch(() => {})

    sendBeneficiaryRequestReceivedEmail({
      email:       request.member.email,
      fullName:    request.member.fullName,
      requestType: type,
    }).catch(e => console.error("⚠️ Receipt email failed:", e.message))

    prisma.auditLog.create({
      data: { action: `BENEFICIARY_REQUEST_${type}`, entity: "BeneficiaryRequest", entityId: request.id, userId: req.user.id }
    }).catch(() => {})

    console.log(`✅ Beneficiary request created: ${type} by ${request.member.memberNumber}`)

  } catch (error) {
    console.error("❌ createRequest error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ── PATCH /api/beneficiary-requests/:id/approve ──────────────────────────────
exports.approveRequest = async (req, res) => {
  try {
    const { id } = req.params

    const request = await prisma.beneficiaryRequest.findUnique({
      where:   { id },
      include: { member: true },
    })
    if (!request)                     return res.status(404).json({ message: "Request not found" })
    if (request.status !== "PENDING") return res.status(400).json({ message: "Request is no longer pending" })

    let resultDependent = null

    // ── Apply the dependent change ────────────────────────────────────────
    if (request.type === "ADD") {
      const rules = DEPENDENT_RULES[request.dependentType]
      if (!rules) return res.status(400).json({ message: `Invalid dependent type: ${request.dependentType}` })

      resultDependent = await prisma.dependent.create({
        data: {
          fullName:        request.fullName,
          type:            request.dependentType,
          dateOfBirth:     request.dateOfBirth     || null,
          nationalId:      request.nationalId      || null,
          birthCertNumber: request.birthCertNumber || null,
          phone:           request.phone           || null,
          relationship:    request.relationship    || null,
          memberId:        request.memberId,
          addedById:       req.user.id,
          notified:        true,
        },
      })

      if (["CHILD_UNDER_18", "CHILD_18_25", "PARENT", "SIBLING"].includes(request.dependentType)) {
        await prisma.user.update({
          where: { id: request.memberId },
          data:  { memberType: "FAMILY", monthlyRate: 500 },
        })
      }
    } else if (request.type === "UPDATE") {
      if (!request.dependentId) return res.status(400).json({ message: "No dependent ID on request" })

      const updateData = {}
      if (request.fullName)        updateData.fullName        = request.fullName
      if (request.dateOfBirth)     updateData.dateOfBirth     = request.dateOfBirth
      if (request.nationalId)      updateData.nationalId      = request.nationalId
      if (request.birthCertNumber) updateData.birthCertNumber = request.birthCertNumber
      if (request.phone)           updateData.phone           = request.phone
      if (request.relationship)    updateData.relationship    = request.relationship

      resultDependent = await prisma.dependent.update({
        where: { id: request.dependentId },
        data:  updateData,
      })
    } else if (request.type === "REMOVE") {
      if (!request.dependentId) return res.status(400).json({ message: "No dependent ID on request" })

      const dep = await prisma.dependent.findUnique({ where: { id: request.dependentId } })
      if (dep) {
        await prisma.dependent.delete({ where: { id: request.dependentId } })

        const remaining = await prisma.dependent.count({
          where: {
            memberId: request.memberId,
            type:     { in: ["CHILD_UNDER_18", "CHILD_18_25", "PARENT", "SIBLING"] },
          },
        })
        if (remaining === 0) {
          await prisma.user.update({
            where: { id: request.memberId },
            data:  { memberType: "SINGLE", monthlyRate: 200 },
          })
        }
      }
    }

    // ── Mark request APPROVED in DB ───────────────────────────────────────
    const updated = await prisma.beneficiaryRequest.update({
      where: { id },
      data:  {
        status:             "APPROVED",
        processedById:      req.user.id,
        processedAt:        new Date(),
        createdDependentId: resultDependent?.id || null,
      },
      include: {
        member:      true,
        processedBy: { select: { id: true, fullName: true } },
      },
    })

    // ── Respond immediately — comms below are fire-and-forget ─────────────
    console.log(`✅ Beneficiary request approved: ${id}`)
    res.json({ message: "Request approved and change applied", request: updated })

    prisma.auditLog.create({
      data: { action: "BENEFICIARY_REQUEST_APPROVED", entity: "BeneficiaryRequest", entityId: id, userId: req.user.id }
    }).catch(() => {})

    const actionLabel = request.type === "ADD"
      ? `added ${request.fullName} as a beneficiary`
      : request.type === "UPDATE"
      ? "updated your beneficiary details"
      : "removed the beneficiary as requested"

    prisma.notification.create({
      data: {
        userId:  request.memberId,
        channel: "IN_APP",
        title:   "Beneficiary request approved ✓",
        message: `Your request has been approved. The secretary has ${actionLabel}.`,
        status:  "SENT",
        sentAt:  new Date(),
      },
    }).catch(() => {})

    sendBeneficiaryRequestProcessedEmail({
      email:         request.member.email,
      fullName:      request.member.fullName,
      requestType:   request.type,
      status:        "APPROVED",
      dependentName: request.fullName || undefined,
    }).catch(e => console.error("⚠️ Approval email failed:", e.message))

    sendBeneficiaryRequestProcessedSMS({
      phone:       request.member.phone,
      fullName:    request.member.fullName,
      requestType: request.type,
      status:      "APPROVED",
    }).catch(e => console.error("⚠️ Approval SMS failed:", e.message))

  } catch (error) {
    console.error("❌ approveRequest error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ── PATCH /api/beneficiary-requests/:id/reject ───────────────────────────────
exports.rejectRequest = async (req, res) => {
  try {
    const { id }     = req.params
    const { reason } = req.body

    const request = await prisma.beneficiaryRequest.findUnique({
      where:   { id },
      include: { member: true },
    })
    if (!request)                     return res.status(404).json({ message: "Request not found" })
    if (request.status !== "PENDING") return res.status(400).json({ message: "Request is no longer pending" })

    const updated = await prisma.beneficiaryRequest.update({
      where: { id },
      data:  {
        status:          "REJECTED",
        processedById:   req.user.id,
        processedAt:     new Date(),
        rejectionReason: reason || null,
      },
      include: {
        member:      true,
        processedBy: { select: { id: true, fullName: true } },
      },
    })

    // ── Respond immediately ───────────────────────────────────────────────
    console.log(`✅ Beneficiary request rejected: ${id}`)
    res.json({ message: "Request rejected", request: updated })

    prisma.auditLog.create({
      data: { action: "BENEFICIARY_REQUEST_REJECTED", entity: "BeneficiaryRequest", entityId: id, userId: req.user.id }
    }).catch(() => {})

    prisma.notification.create({
      data: {
        userId:  request.memberId,
        channel: "IN_APP",
        title:   "Beneficiary request not approved",
        message: `Your beneficiary ${request.type.toLowerCase()} request was not approved.${reason ? ` Reason: ${reason}` : ""}`,
        status:  "SENT",
        sentAt:  new Date(),
      },
    }).catch(() => {})

    sendBeneficiaryRequestProcessedEmail({
      email:       request.member.email,
      fullName:    request.member.fullName,
      requestType: request.type,
      status:      "REJECTED",
      reason:      reason,
    }).catch(e => console.error("⚠️ Rejection email failed:", e.message))

    sendBeneficiaryRequestProcessedSMS({
      phone:       request.member.phone,
      fullName:    request.member.fullName,
      requestType: request.type,
      status:      "REJECTED",
    }).catch(e => console.error("⚠️ Rejection SMS failed:", e.message))

  } catch (error) {
    console.error("❌ rejectRequest error:", error.message)
    res.status(500).json({ error: error.message })
  }
}