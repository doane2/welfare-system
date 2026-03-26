const prisma = require("../lib/prisma")

// ✅ Safe payment fields
const safePaymentFields = (p) => ({
  id: p.id,
  amount: p.amount,
  method: p.method,
  mpesaRef: p.mpesaRef,
  status: p.status,
  userId: p.userId,
  contributionId: p.contributionId,
  createdAt: p.createdAt
})

// CREATE PAYMENT
exports.createPayment = async (req, res) => {
  try {
    const { userId, amount, method, mpesaRef, contributionId } = req.body

    if (!userId || !amount || !method) {
      return res.status(400).json({ message: "userId, amount and method are required" })
    }

    const validMethods = ["MPESA", "BANK", "CASH"]
    if (!validMethods.includes(method)) {
      return res.status(400).json({ message: `method must be one of: ${validMethods.join(", ")}` })
    }

    // Confirm member exists
    const member = await prisma.user.findUnique({ where: { id: userId } })
    if (!member) {
      return res.status(404).json({ message: "Member not found" })
    }

    // Confirm contribution exists if provided
    if (contributionId) {
      const contribution = await prisma.contribution.findUnique({ where: { id: contributionId } })
      if (!contribution) {
        return res.status(404).json({ message: "Contribution not found" })
      }
    }

    // Check for duplicate M-Pesa reference
    if (mpesaRef) {
      const duplicate = await prisma.payment.findFirst({ where: { mpesaRef } })
      if (duplicate) {
        return res.status(400).json({ message: "M-Pesa reference already used" })
      }
    }

    const payment = await prisma.payment.create({
      data: {
        userId,
        amount: parseFloat(amount),
        method,
        mpesaRef: mpesaRef || null,
        status: "COMPLETED",
        contributionId: contributionId || null
      }
    })

    // If linked to a contribution, mark it as paid
    if (contributionId) {
      await prisma.contribution.update({
        where: { id: contributionId },
        data: { paid: true, status: "APPROVED", approvedById: req.user?.id, approvedAt: new Date() }
      })
    }

    // Log audit trail
    if (req.user?.id) {
      await prisma.auditLog.create({
        data: {
          action: "CREATE_PAYMENT",
          entity: "Payment",
          entityId: payment.id,
          userId: req.user.id
        }
      }).catch((e) => console.error("⚠️ Audit log failed:", e.message))
    }

    console.log("✅ Payment created:", payment.id)

    res.status(201).json({
      message: "Payment recorded successfully",
      payment: safePaymentFields(payment)
    })

  } catch (error) {
    console.error("❌ createPayment error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// GET ALL PAYMENTS with pagination & filters
exports.getPayments = async (req, res) => {
  try {
    const { page = 1, limit = 10, userId, method, status } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)

    const whereClause = {
      ...(userId && { userId }),
      ...(method && { method }),
      ...(status && { status })
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where: whereClause,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, fullName: true, memberNumber: true } },
          contribution: { select: { id: true, type: true, period: true } }
        }
      }),
      prisma.payment.count({ where: whereClause })
    ])

    res.json({
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      payments
    })

  } catch (error) {
    console.error("❌ getPayments error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// GET SINGLE PAYMENT
exports.getPaymentById = async (req, res) => {
  try {
    const { id } = req.params

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, fullName: true, memberNumber: true, email: true } },
        contribution: true
      }
    })

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" })
    }

    // Members can only view their own
    if (req.user.role === "MEMBER" && payment.userId !== req.user.id) {
      return res.status(403).json({ message: "Access denied" })
    }

    res.json({ payment })

  } catch (error) {
    console.error("❌ getPaymentById error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// MPESA WEBHOOK (raw webhook handler)
exports.mpesaWebhook = async (req, res) => {
  try {
    const webhookData = req.body

    console.log("📥 M-Pesa webhook received:", JSON.stringify(webhookData))

    const mpesaRef = webhookData?.Body?.stkCallback?.CheckoutRequestID
    const resultCode = webhookData?.Body?.stkCallback?.ResultCode

    if (!mpesaRef) {
      return res.status(400).json({ message: "Invalid webhook payload" })
    }

    // Find payment by mpesaRef
    const payment = await prisma.payment.findFirst({ where: { mpesaRef } })

    if (!payment) {
      console.warn("⚠️ Payment not found for mpesaRef:", mpesaRef)
      return res.status(200).json({ message: "Webhook received" })
    }

    // Update payment status based on result
    const status = resultCode === 0 ? "COMPLETED" : "FAILED"

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status,
        rawWebhook: webhookData
      }
    })

    console.log(`✅ Payment ${payment.id} updated to ${status}`)

    res.status(200).json({ message: "Webhook processed" })

  } catch (error) {
    console.error("❌ mpesaWebhook error:", error.message)
    res.status(500).json({ error: error.message })
  }
}
