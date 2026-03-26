const prisma  = require("../lib/prisma")
const axios   = require("axios")
require("dotenv").config()

const {
  sendPaymentApprovedEmail,
  sendPaymentRejectedEmail,
} = require("../services/emailService")

// ─── All Daraja credentials from .env ─────────────────────────────────────────
// Required .env keys:
//   MPESA_CONSUMER_KEY      — Daraja app consumer key
//   MPESA_CONSUMER_SECRET   — Daraja app consumer secret
//   MPESA_SHORTCODE         — Paybill or till number
//   MPESA_PASSKEY           — Lipa na M-Pesa passkey
//   MPESA_CALLBACK_URL      — Public URL for callbacks
//   MPESA_ENV               — "sandbox" or "live"
const {
  MPESA_CONSUMER_KEY,
  MPESA_CONSUMER_SECRET,
  MPESA_SHORTCODE,
  MPESA_PASSKEY,
  MPESA_CALLBACK_URL,
  MPESA_ENV,
} = process.env

const DARAJA_BASE = MPESA_ENV === "live"
  ? "https://api.safaricom.co.ke"
  : "https://sandbox.safaricom.co.ke"

// ─── Helpers ───────────────────────────────────────────────────────────────────
const getAccessToken = async () => {
  const credentials = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString("base64")
  const { data }    = await axios.get(
    `${DARAJA_BASE}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${credentials}` } }
  )
  return data.access_token
}

const generatePassword = () => {
  const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, "").slice(0, 14)
  const password  = Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString("base64")
  return { password, timestamp }
}

const normalizePhone = (phone) => {
  phone = String(phone).trim().replace(/[\s\-\(\)]/g, "")
  if (phone.startsWith("+254")) return phone.replace("+", "")
  if (phone.startsWith("254"))  return phone
  if (phone.startsWith("07"))   return "254" + phone.slice(1)
  if (phone.startsWith("01"))   return "254" + phone.slice(1)
  return phone
}

const normalizePhoneForSMS = (phone) => {
  phone = String(phone).trim().replace(/[\s\-()]/g, "")
  if (phone.startsWith("+254")) return phone
  if (phone.startsWith("254"))  return "+" + phone
  if (phone.startsWith("07"))   return "+254" + phone.slice(1)
  return phone
}

// ─── Check if Daraja is configured ────────────────────────────────────────────
const isDarajaConfigured = () =>
  !!(MPESA_CONSUMER_KEY && MPESA_CONSUMER_SECRET && MPESA_SHORTCODE && MPESA_PASSKEY && MPESA_CALLBACK_URL)

// ─── STK PUSH ─────────────────────────────────────────────────────────────────
// Returns a "coming soon" response if Daraja credentials are not yet in .env
exports.stkPush = async (req, res) => {
  if (!isDarajaConfigured()) {
    return res.status(503).json({
      comingSoon: true,
      message:    "M-Pesa STK Push is coming soon. Please use manual payment (cash or bank transfer) for now and notify your administrator.",
    })
  }

  try {
    const { phone, amount, period, userId } = req.body

    if (!phone || !amount || !period || !userId) {
      return res.status(400).json({ message: "phone, amount, period and userId are required" })
    }

    const member = await prisma.user.findUnique({ where: { id: userId } })
    if (!member) return res.status(404).json({ message: "Member not found" })

    // Find or create contribution record for this period
    let contribution = await prisma.contribution.findFirst({
      where: { userId, period, type: "MONTHLY" },
    })
    if (!contribution) {
      contribution = await prisma.contribution.create({
        data: {
          userId,
          amount:  parseFloat(amount),
          type:    "MONTHLY",
          period,
          paid:    false,
          status:  "PENDING",
          dueDate: new Date(),
        },
      })
    }

    const accessToken             = await getAccessToken()
    const { password, timestamp } = generatePassword()
    const normalizedPhone         = normalizePhone(phone)

    const payload = {
      BusinessShortCode: MPESA_SHORTCODE,
      Password:          password,
      Timestamp:         timestamp,
      TransactionType:   "CustomerPayBillOnline",
      Amount:            Math.ceil(parseFloat(amount)),
      PartyA:            normalizedPhone,
      PartyB:            MPESA_SHORTCODE,
      PhoneNumber:       normalizedPhone,
      CallBackURL:       `${MPESA_CALLBACK_URL}/api/mpesa/stk-callback`,
      AccountReference:  member.memberNumber,
      TransactionDesc:   `Welfare contribution ${period} — ${member.memberNumber}`,
    }

    const { data } = await axios.post(
      `${DARAJA_BASE}/mpesa/stkpush/v1/processrequest`,
      payload,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (data.ResponseCode !== "0") {
      return res.status(400).json({ message: data.ResponseDescription || "STK Push failed" })
    }

    await prisma.payment.create({
      data: {
        userId,
        contributionId: contribution.id,
        amount:         parseFloat(amount),
        method:         "MPESA",
        status:         "PENDING",
        mpesaRef:       data.CheckoutRequestID,
        rawWebhook:     JSON.stringify(data),
      },
    })

    await prisma.auditLog.create({
      data: { action: "STK_PUSH_INITIATED", entity: "Payment", entityId: contribution.id, userId },
    }).catch(() => {})

    console.log(`✅ STK Push sent to ${normalizedPhone} — CheckoutRequestID: ${data.CheckoutRequestID}`)

    res.json({
      message:           "STK Push sent. Enter your M-Pesa PIN to complete payment.",
      checkoutRequestId: data.CheckoutRequestID,
      contributionId:    contribution.id,
    })

  } catch (error) {
    console.error("❌ stkPush error:", error.response?.data || error.message)
    res.status(500).json({ error: error.response?.data?.errorMessage || error.message })
  }
}

// ─── STK CALLBACK ─────────────────────────────────────────────────────────────
exports.stkCallback = async (req, res) => {
  try {
    const body       = req.body?.Body?.stkCallback
    const resultCode = body?.ResultCode

    console.log("📲 STK Callback received:", JSON.stringify(body, null, 2))

    if (resultCode !== 0) {
      console.warn(`⚠️ STK payment failed — ResultCode: ${resultCode} — ${body?.ResultDesc}`)
      const checkoutId = body?.CheckoutRequestID
      if (checkoutId) {
        await prisma.payment.updateMany({
          where: { mpesaRef: checkoutId, status: "PENDING" },
          data:  { status: "FAILED", rawWebhook: JSON.stringify(body) },
        })
      }
      return res.json({ ResultCode: 0, ResultDesc: "Accepted" })
    }

    const metadata   = body?.CallbackMetadata?.Item || []
    const get        = (name) => metadata.find(i => i.Name === name)?.Value
    const mpesaCode  = get("MpesaReceiptNumber")
    const paidAmount = get("Amount")
    const checkoutId = body?.CheckoutRequestID

    const payment = await prisma.payment.findFirst({ where: { mpesaRef: checkoutId } })
    if (!payment) {
      console.error(`❌ No payment found for CheckoutRequestID: ${checkoutId}`)
      return res.json({ ResultCode: 0, ResultDesc: "Accepted" })
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data:  { mpesaRef: mpesaCode, status: "PENDING_APPROVAL", rawWebhook: JSON.stringify(body) },
    })

    console.log(`✅ STK payment queued for approval: ${mpesaCode} — KES ${paidAmount}`)
    res.json({ ResultCode: 0, ResultDesc: "Accepted" })

  } catch (error) {
    console.error("❌ stkCallback error:", error.message)
    res.json({ ResultCode: 0, ResultDesc: "Accepted" })
  }
}

// ─── C2B REGISTER URLS ────────────────────────────────────────────────────────
exports.registerC2BUrls = async (req, res) => {
  try {
    const accessToken = await getAccessToken()
    const { data }    = await axios.post(
      `${DARAJA_BASE}/mpesa/c2b/v1/registerurl`,
      {
        ShortCode:       MPESA_SHORTCODE,
        ResponseType:    "Completed",
        ConfirmationURL: `${MPESA_CALLBACK_URL}/api/mpesa/c2b-confirmation`,
        ValidationURL:   `${MPESA_CALLBACK_URL}/api/mpesa/c2b-validation`,
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    console.log("✅ C2B URLs registered:", data)
    res.json({ message: "C2B URLs registered successfully", data })
  } catch (error) {
    console.error("❌ registerC2BUrls error:", error.response?.data || error.message)
    res.status(500).json({ error: error.message })
  }
}

// ─── C2B VALIDATION ───────────────────────────────────────────────────────────
exports.c2bValidation = async (req, res) => {
  res.json({ ResultCode: 0, ResultDesc: "Accepted" })
}

// ─── C2B CONFIRMATION ─────────────────────────────────────────────────────────
exports.c2bConfirmation = async (req, res) => {
  try {
    const { TransID, TransAmount, MSISDN, BillRefNumber } = req.body

    console.log("📲 C2B Confirmation received:", req.body)

    let member = await prisma.user.findFirst({ where: { memberNumber: BillRefNumber } })

    if (!member && MSISDN) {
      const normalized = normalizePhone(String(MSISDN))
      member = await prisma.user.findFirst({
        where: {
          OR: [
            { phone: normalized },
            { phone: "0" + normalized.slice(3) },
            { phone: "+" + normalized },
          ],
        },
      })
    }

    if (!member) {
      console.warn(`⚠️ C2B: No member found for BillRef: ${BillRefNumber} | Phone: ${MSISDN}`)
      return res.json({ ResultCode: 0, ResultDesc: "Accepted" })
    }

    const payment = await prisma.payment.create({
      data: {
        userId:     member.id,
        amount:     parseFloat(TransAmount),
        method:     "MPESA",
        status:     "PENDING_APPROVAL",
        mpesaRef:   TransID,
        rawWebhook: JSON.stringify(req.body),
      },
    })

    await prisma.auditLog.create({
      data: { action: "C2B_PAYMENT_RECEIVED", entity: "Payment", entityId: payment.id, userId: member.id },
    }).catch(() => {})

    console.log(`✅ C2B payment recorded: ${TransID} — KES ${TransAmount} | Member: ${member.memberNumber}`)
    res.json({ ResultCode: 0, ResultDesc: "Accepted" })

  } catch (error) {
    console.error("❌ c2bConfirmation error:", error.message)
    res.json({ ResultCode: 0, ResultDesc: "Accepted" })
  }
}

// ─── RECORD MANUAL PAYMENT ────────────────────────────────────────────────────
exports.recordManualPayment = async (req, res) => {
  try {
    const { userId, amount, method, reference, period, notes, date } = req.body

    if (!userId || !amount || !method || !period) {
      return res.status(400).json({ message: "userId, amount, method and period are required" })
    }

    const member = await prisma.user.findUnique({ where: { id: userId } })
    if (!member) return res.status(404).json({ message: "Member not found" })

    const validMethods = ["MPESA", "BANK", "CASH"]
    if (!validMethods.includes(method.toUpperCase())) {
      return res.status(400).json({ message: `method must be one of: ${validMethods.join(", ")}` })
    }

    let contribution = await prisma.contribution.findFirst({
      where: { userId, period, type: "MONTHLY" },
    })
    if (!contribution) {
      contribution = await prisma.contribution.create({
        data: {
          userId,
          amount:  parseFloat(amount),
          type:    "MONTHLY",
          period,
          paid:    false,
          status:  "PENDING",
          dueDate: date ? new Date(date) : new Date(),
        },
      })
    }

    const existing = await prisma.payment.findFirst({
      where: {
        userId,
        contributionId: contribution.id,
        status: { in: ["PENDING_APPROVAL", "APPROVED"] },
      },
    })
    if (existing) {
      return res.status(400).json({
        message: "A payment for this period is already recorded or pending approval",
      })
    }

    const payment = await prisma.payment.create({
      data: {
        userId,
        contributionId: contribution.id,
        amount:         parseFloat(amount),
        method:         method.toUpperCase(),
        status:         "PENDING_APPROVAL",
        mpesaRef:       reference || null,
        rawWebhook:     JSON.stringify({ notes, date, recordedBy: req.user.id }),
      },
    })

    await prisma.auditLog.create({
      data: {
        action:   "MANUAL_PAYMENT_RECORDED",
        entity:   "Payment",
        entityId: payment.id,
        userId:   req.user.id,
      },
    }).catch(() => {})

    console.log(`✅ Manual payment recorded: KES ${amount} | Member: ${member.memberNumber} | Period: ${period}`)

    res.status(201).json({
      message: "Payment recorded and queued for approval",
      payment,
    })

  } catch (error) {
    console.error("❌ recordManualPayment error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ─── GET PENDING PAYMENTS ─────────────────────────────────────────────────────
exports.getPendingPayments = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where:   { status: "PENDING_APPROVAL" },
        skip,
        take:    parseInt(limit),
        orderBy: { createdAt: "asc" },
        include: {
          user:         { select: { id: true, fullName: true, memberNumber: true, phone: true, email: true } },
          contribution: { select: { period: true, type: true } },
        },
      }),
      prisma.payment.count({ where: { status: "PENDING_APPROVAL" } }),
    ])

    res.json({ page: parseInt(page), limit: parseInt(limit), total, payments })

  } catch (error) {
    console.error("❌ getPendingPayments error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ─── APPROVE PAYMENT ──────────────────────────────────────────────────────────
exports.approvePayment = async (req, res) => {
  try {
    const { id }  = req.params
    const adminId = req.user.id

    const payment = await prisma.payment.findUnique({
      where:   { id },
      include: { user: true, contribution: true },
    })
    if (!payment) return res.status(404).json({ message: "Payment not found" })
    if (payment.status !== "PENDING_APPROVAL") {
      return res.status(400).json({ message: "Only pending payments can be approved" })
    }

    // Two-admin rule
    const rawWebhook = (() => { try { return JSON.parse(payment.rawWebhook || "{}") } catch { return {} } })()
    if (rawWebhook.recordedBy === adminId) {
      return res.status(403).json({ message: "You cannot approve a payment you recorded. Another admin must approve it." })
    }

    const member      = payment.user
    const monthlyRate = Number(member.monthlyRate || (member.memberType === "FAMILY" ? 500 : 200))
    const annualRate  = monthlyRate * 12
    const curYear     = new Date().getFullYear()

    const result = await prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id },
        data:  { status: "APPROVED" },
      })

      let contribution
      if (payment.contributionId) {
        contribution = await tx.contribution.update({
          where: { id: payment.contributionId },
          data:  { paid: true, status: "APPROVED", approvedById: adminId, approvedAt: new Date() },
        })
      } else {
        contribution = await tx.contribution.create({
          data: {
            userId:       payment.userId,
            amount:       payment.amount,
            type:         "MONTHLY",
            period:       payment.contribution?.period || `${curYear}`,
            paid:         true,
            status:       "APPROVED",
            approvedById: adminId,
            approvedAt:   new Date(),
            dueDate:      new Date(),
          },
        })
        await tx.payment.update({ where: { id }, data: { contributionId: contribution.id } })
      }

      const agg = await tx.contribution.aggregate({
        where: {
          userId:    payment.userId,
          type:      "MONTHLY",
          paid:      true,
          status:    "APPROVED",
          updatedAt: {
            gte: new Date(`${curYear}-01-01`),
            lte: new Date(`${curYear}-12-31`),
          },
        },
        _sum: { amount: true },
      })
      const paidThisYear   = Number(agg._sum.amount || 0)
      const arrearsBalance = Math.max(0, annualRate - paidThisYear)
      const unpaidMonths   = arrearsBalance > 0 ? Math.ceil(arrearsBalance / monthlyRate) : 0

      await tx.notification.create({
        data: {
          userId:  payment.userId,
          channel: "IN_APP",
          title:   "Payment Approved ✓",
          message: `Your payment of KES ${Number(payment.amount).toLocaleString()} for ${contribution.period} has been approved. Outstanding: KES ${arrearsBalance.toLocaleString()}.`,
          status:  "SENT",
        },
      })

      await tx.auditLog.create({
        data: { action: "APPROVE_PAYMENT", entity: "Payment", entityId: id, userId: adminId },
      })

      return { updatedPayment, contribution, paidThisYear, arrearsBalance, unpaidMonths }
    })

    const period = result.contribution?.period || ""
    Promise.allSettled([
      sendPaymentApprovedEmail({
        email:          member.email,
        fullName:       member.fullName,
        amount:         payment.amount,
        period,
        method:         payment.method,
        mpesaRef:       payment.mpesaRef,
        arrearsBalance: result.arrearsBalance,
        annualRate,
      }),
      (async () => {
        if (member.phone) {
          try {
            const smsService = require("../services/smsService")
            if (typeof smsService.sendPaymentApprovedSMS === "function") {
              await smsService.sendPaymentApprovedSMS({
                phone:          member.phone,
                fullName:       member.fullName,
                amount:         payment.amount,
                period,
                arrearsBalance: result.arrearsBalance,
              })
            }
          } catch (e) { console.error("⚠️ SMS failed:", e.message) }
        }
      })(),
    ]).then(results => {
      results.forEach((r, i) => {
        if (r.status === "rejected") console.error(`⚠️ Notify [${i === 0 ? "email" : "SMS"}] failed:`, r.reason?.message)
      })
    })

    console.log(`✅ Payment approved: ${id} | Member: ${member.memberNumber}`)

    res.json({
      message:        "Payment approved successfully",
      payment:        result.updatedPayment,
      contribution:   result.contribution,
      unpaidMonths:   result.unpaidMonths,
      arrearsBalance: result.arrearsBalance,
    })

  } catch (error) {
    console.error("❌ approvePayment error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ─── REJECT PAYMENT ───────────────────────────────────────────────────────────
exports.rejectPayment = async (req, res) => {
  try {
    const { id }     = req.params
    const { reason } = req.body

    const payment = await prisma.payment.findUnique({
      where:   { id },
      include: { user: true, contribution: true },
    })
    if (!payment) return res.status(404).json({ message: "Payment not found" })
    if (payment.status !== "PENDING_APPROVAL") {
      return res.status(400).json({ message: "Only pending payments can be rejected" })
    }

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({ where: { id }, data: { status: "FAILED" } })
      await tx.notification.create({
        data: {
          userId:  payment.userId,
          channel: "IN_APP",
          title:   "Payment Rejected",
          message: `Your payment of KES ${Number(payment.amount).toLocaleString()} was rejected.${reason ? ` Reason: ${reason}` : ""} Contact your administrator.`,
          status:  "SENT",
        },
      })
      await tx.auditLog.create({
        data: { action: "REJECT_PAYMENT", entity: "Payment", entityId: id, userId: req.user.id },
      })
    })

    const member = payment.user
    const period = payment.contribution?.period || ""

    Promise.allSettled([
      sendPaymentRejectedEmail({
        email:    member.email,
        fullName: member.fullName,
        amount:   payment.amount,
        period,
        reason,
      }),
      (async () => {
        if (member.phone) {
          try {
            const smsService = require("../services/smsService")
            if (typeof smsService.sendPaymentRejectedSMS === "function") {
              await smsService.sendPaymentRejectedSMS({ phone: member.phone, fullName: member.fullName, amount: payment.amount, period, reason })
            }
          } catch {}
        }
      })(),
    ]).then(results => {
      results.forEach((r, i) => {
        if (r.status === "rejected") console.error(`⚠️ Rejection notify [${i === 0 ? "email" : "SMS"}] failed:`, r.reason?.message)
      })
    })

    console.log(`✅ Payment rejected: ${id}`)
    res.json({ message: "Payment rejected" })

  } catch (error) {
    console.error("❌ rejectPayment error:", error.message)
    res.status(500).json({ error: error.message })
  }
}