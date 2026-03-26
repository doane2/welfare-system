// backend/src/services/smsService.js
/**
 * SMS Service — Africa's Talking
 * ────────────────────────────────
 * Ported from the Electron bulk SMS app (renderer.js)
 * into a reusable backend service.
 *
 * Mirrors emailService.js structure so both can be
 * called together from any controller.
 */

const Africastalking = require("africastalking")
require("dotenv").config()

// ─── Initialize Africa's Talking ──────────────────────────────────────────────
const getAT = () => {
  const env      = process.env.AT_ENVIRONMENT || "sandbox"
  const apiKey   = process.env.AT_API_KEY

  // Sandbox ALWAYS requires username = "sandbox"
  const username = env === "sandbox" ? "sandbox" : process.env.AT_USERNAME

  if (!username || !apiKey) {
    throw new Error("Missing Africa's Talking credentials in .env (AT_USERNAME, AT_API_KEY)")
  }

  console.log(`📱 AT environment: ${env.toUpperCase()} | username: ${username}`)

  return Africastalking({ username, apiKey }).SMS
}

// ─── Phone Number Normalizer ──────────────────────────────────────────────────
const normalizePhone = (number) => {
  if (!number) return null
  number = String(number).trim().replace(/[\s\-\(\)]/g, "")
  if (number.startsWith("+2547")) return number
  if (number.startsWith("2547"))  return "+" + number
  if (number.startsWith("07"))    return "+254" + number.slice(1)
  if (number.startsWith("+2541")) return number
  return null
}

// ─── Base SMS Sender ──────────────────────────────────────────────────────────
const sendSMS = async ({ to, message }) => {
  if (!to || !message) {
    console.error("❌ Missing phone or message — SMS not sent")
    return
  }

  const phone = normalizePhone(to)
  if (!phone) {
    console.error(`❌ Invalid phone number: ${to} — SMS not sent`)
    return
  }

  const senderId = process.env.AT_SENDER_ID || undefined

  try {
    const sms = getAT()
    const res = await sms.send({ to: [phone], message, from: senderId })

    const recipients = res?.SMSMessageData?.Recipients || []
    recipients.forEach((r) => {
      if (r.status === "Success") console.log(`✅ SMS sent to ${r.number}`)
      else                        console.warn(`⚠️ SMS failed to ${r.number}: ${r.status}`)
    })
  } catch (error) {
    console.error(`❌ SMS send error to ${to}:`, error.message)
    throw error
  }
}

// ─── Bulk SMS Sender ──────────────────────────────────────────────────────────
const sendBulkSMS = async (recipients, message) => {
  if (!recipients || recipients.length === 0) {
    console.warn("⚠️ No recipients for bulk SMS")
    return
  }

  const phones = recipients.map((r) => normalizePhone(r.phone)).filter(Boolean)
  if (phones.length === 0) { console.warn("⚠️ No valid phone numbers found"); return }

  const senderId  = process.env.AT_SENDER_ID || undefined
  const chunkSize = 1000

  try {
    const sms = getAT()
    for (let i = 0; i < phones.length; i += chunkSize) {
      const chunk = phones.slice(i, i + chunkSize)
      const res   = await sms.send({ to: chunk, message, from: senderId })
      const results = res?.SMSMessageData?.Recipients || []
      const sent    = results.filter((r) => r.status === "Success").length
      const failed  = results.filter((r) => r.status !== "Success").length
      console.log(`📱 Bulk SMS batch ${Math.floor(i / chunkSize) + 1}: ${sent} sent, ${failed} failed`)
    }
  } catch (error) {
    console.error("❌ Bulk SMS error:", error.message)
    throw error
  }
}

// ─── 1. Account Activation SMS ───────────────────────────────────────────────
const sendActivationSMS = async ({ phone, fullName, activationLink }) => {
  await sendSMS({
    to:      phone,
    message: `Hello ${fullName}, your Welfare System account has been created. Activate it here: ${activationLink}`,
  })
}

// ─── 2. Loan Approved SMS ─────────────────────────────────────────────────────
const sendLoanApprovedSMS = async ({ phone, fullName, principal, interestRate, repaymentSchedule }) => {
  const totalDue      = principal + principal * interestRate
  const months        = repaymentSchedule?.length || 0
  const monthlyAmount = repaymentSchedule?.[0]?.amount || 0
  await sendSMS({
    to:      phone,
    message: `Hello ${fullName}, your loan of KES ${principal.toLocaleString()} has been APPROVED. Total repayable: KES ${totalDue.toLocaleString()} over ${months} months at KES ${monthlyAmount.toLocaleString()}/month. Log in for details.`,
  })
}

// ─── 3. Loan Rejected SMS ─────────────────────────────────────────────────────
const sendLoanRejectedSMS = async ({ phone, fullName, principal }) => {
  await sendSMS({
    to:      phone,
    message: `Hello ${fullName}, your loan application of KES ${principal.toLocaleString()} was not approved. Contact your welfare administrator for more information.`,
  })
}

// ─── 4. Claim Approved SMS ────────────────────────────────────────────────────
const sendClaimApprovedSMS = async ({ phone, fullName, claimType, amount }) => {
  await sendSMS({
    to:      phone,
    message: `Hello ${fullName}, your ${claimType} welfare claim has been APPROVED.${amount ? ` Amount: KES ${Number(amount).toLocaleString()}.` : ""} Disbursement will be processed shortly.`,
  })
}

// ─── 5. Claim Rejected SMS ────────────────────────────────────────────────────
const sendClaimRejectedSMS = async ({ phone, fullName, claimType, reason }) => {
  await sendSMS({
    to:      phone,
    message: `Hello ${fullName}, your ${claimType} welfare claim was not approved.${reason ? ` Reason: ${reason}` : ""} Contact your welfare administrator for more information.`,
  })
}

// ─── 6. Contribution Due Reminder SMS ────────────────────────────────────────
const sendContributionReminderSMS = async ({ phone, fullName, amount, type, period, dueDate }) => {
  const formattedDate = new Date(dueDate).toDateString()
  const typeLabel     = type === "MONTHLY"      ? "Monthly Contribution"
                      : type === "REGISTRATION" ? "Registration Fee"
                      : type === "EMERGENCY"    ? "Emergency Contribution"
                      : type
  await sendSMS({
    to:      phone,
    message: `Hello ${fullName}, reminder: your ${typeLabel}${period ? ` for ${period}` : ""} of KES ${Number(amount).toLocaleString()} is due on ${formattedDate}. Please pay on time.`,
  })
}

// ─── 7. New Announcement SMS ──────────────────────────────────────────────────
const sendAnnouncementSMS = async (recipients, title) => {
  await sendBulkSMS(
    recipients,
    `Welfare System Notice: ${title}. Log in for full details: ${process.env.APP_URL}`
  )
}

// ─── 8. Loan Repayment Confirmation SMS ──────────────────────────────────────
const sendRepaymentConfirmationSMS = async ({ phone, fullName, amount, totalRepaid, totalDue, fullyPaid }) => {
  const remaining = Math.max(0, totalDue - totalRepaid)
  await sendSMS({
    to:      phone,
    message: fullyPaid
      ? `Congratulations ${fullName}! Your loan has been FULLY REPAID. Total paid: KES ${Number(totalRepaid).toLocaleString()}. Thank you!`
      : `Hello ${fullName}, repayment of KES ${Number(amount).toLocaleString()} received. Total repaid: KES ${Number(totalRepaid).toLocaleString()}. Outstanding: KES ${Number(remaining).toLocaleString()}.`,
  })
}

// ─── 9. OTP / 2FA SMS ────────────────────────────────────────────────────────
const sendOtpSMS = async ({ phone, message }) => {
  if (!phone) {
    console.warn("⚠️ No phone number for OTP SMS — skipping")
    return
  }
  await sendSMS({ to: phone, message })
  console.log(`✅ OTP SMS sent to ${phone}`)
}

// ─── Exports ──────────────────────────────────────────────────────────────────
module.exports = {
  sendActivationSMS,
  sendLoanApprovedSMS,
  sendLoanRejectedSMS,
  sendClaimApprovedSMS,
  sendClaimRejectedSMS,
  sendContributionReminderSMS,
  sendAnnouncementSMS,
  sendRepaymentConfirmationSMS,
  sendOtpSMS,
}