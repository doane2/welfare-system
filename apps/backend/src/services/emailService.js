const nodemailer = require("nodemailer")
require("dotenv").config()

// ─── Transporter Setup ────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host:    "smtp.gmail.com",
  port:    465,
  secure:  true,
  family:  4,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

transporter.verify((error) => {
  if (error) console.error("❌ Email transporter verification failed:", error.message)
  else       console.log("✅ Email server is ready to send messages")
})

// ─── Base Email Sender ────────────────────────────────────────────────────────
const sendEmail = async ({ to, subject, text, html }) => {
  if (!to || !subject || !text) {
    console.error("❌ Missing email fields — email not sent")
    return
  }
  try {
    const info = await transporter.sendMail({
      from: `"Crater SDA Welfare Society" <${process.env.EMAIL_USER}>`,
      to, subject, text,
      ...(html && { html }),
    })
    console.log(`✅ Email sent to ${to} | Subject: "${subject}" | ID: ${info.messageId}`)
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error.message)
    throw error
  }
}

// ─── 1. Account Activation ────────────────────────────────────────────────────
const sendActivationEmail = async (email, token) => {
  if (!email || !token) { console.error("❌ Missing email or token"); return }
  const activationLink = `${process.env.APP_URL}/activate-account?token=${token}`
  await sendEmail({
    to:      email,
    subject: "Activate your Welfare Account",
    text: `
Hello,

Your Crater SDA Welfare Society account has been created.

To activate your account and set your password, please visit the link below:

${activationLink}

This link will expire in 24 hours.

If you did not expect this email, please ignore it.

Regards,
Crater SDA Welfare Society Team
    `.trim(),
  })
}

// ─── 2. Payment Approved ──────────────────────────────────────────────────────
const sendPaymentApprovedEmail = async ({ email, fullName, amount, period, method, mpesaRef, arrearsBalance, annualRate }) => {
  await sendEmail({
    to:      email,
    subject: `Payment Approved — ${period}`,
    text: `
Hello ${fullName},

Your payment has been approved and your contribution record updated.

Payment Details:
  Period          : ${period}
  Amount Paid     : KES ${Number(amount).toLocaleString()}
  Payment Method  : ${method || "M-Pesa"}
  ${mpesaRef ? `M-Pesa Reference : ${mpesaRef}` : ""}

Contribution Status:
  Annual Obligation : KES ${Number(annualRate || 0).toLocaleString()}
  Outstanding       : KES ${Number(arrearsBalance || 0).toLocaleString()}
  ${arrearsBalance <= 0 ? "Status            : Fully paid for this year ✓" : ""}

${arrearsBalance > 0
  ? `Please ensure you complete your annual contribution of KES ${Number(annualRate || 0).toLocaleString()} by 31 March.`
  : "Thank you for completing your annual contribution!"
}

Log in to view your full contribution history:
${process.env.APP_URL}

Regards,
Crater SDA Welfare Society Team
    `.trim(),
  })
}

// ─── 3. Payment Rejected ──────────────────────────────────────────────────────
const sendPaymentRejectedEmail = async ({ email, fullName, amount, period, reason }) => {
  await sendEmail({
    to:      email,
    subject: `Payment Not Approved — ${period}`,
    text: `
Hello ${fullName},

We regret to inform you that your payment of KES ${Number(amount).toLocaleString()} for ${period} was not approved.

${reason ? `Reason: ${reason}` : "Please contact your welfare administrator for more details."}

If you believe this is an error, please contact your welfare administrator or visit:
${process.env.APP_URL}

Regards,
Crater SDA Welfare Society Team
    `.trim(),
  })
}

// ─── 4. Contribution Approved ─────────────────────────────────────────────────
const sendContributionApprovedEmail = async ({ email, fullName, amount, period, type }) => {
  await sendEmail({
    to:      email,
    subject: `Contribution Approved — ${period}`,
    text: `
Hello ${fullName},

Your ${type || "MONTHLY"} contribution has been approved.

Details:
  Period  : ${period}
  Amount  : KES ${Number(amount).toLocaleString()}
  Status  : Approved ✓

Log in to view your contribution history:
${process.env.APP_URL}

Regards,
Crater SDA Welfare Society Team
    `.trim(),
  })
}

// ─── 5. Loan Approved ─────────────────────────────────────────────────────────
const sendLoanApprovedEmail = async ({ email, fullName, principal, interestRate, repaymentSchedule }) => {
  const totalDue         = principal + principal * interestRate
  const firstInstallment = repaymentSchedule?.[0]
  await sendEmail({
    to:      email,
    subject: "Your Loan Application Has Been Approved",
    text: `
Hello ${fullName},

Good news! Your loan application has been approved.

Loan Details:
  Principal Amount : KES ${Number(principal).toLocaleString()}
  Interest Rate    : ${(interestRate * 100).toFixed(0)}%
  Total Repayable  : KES ${Number(totalDue).toLocaleString()}
  Installments     : ${repaymentSchedule?.length || 0} months
  First Payment Due: ${firstInstallment ? new Date(firstInstallment.dueDate).toDateString() : "N/A"}
  Monthly Amount   : KES ${firstInstallment?.amount?.toLocaleString() || "N/A"}

Log in to view your repayment schedule:
${process.env.APP_URL}

Regards,
Crater SDA Welfare Society Team
    `.trim(),
  })
}

// ─── 6. Loan Rejected ─────────────────────────────────────────────────────────
const sendLoanRejectedEmail = async ({ email, fullName, principal }) => {
  await sendEmail({
    to:      email,
    subject: "Your Loan Application Was Not Approved",
    text: `
Hello ${fullName},

We regret to inform you that your loan application of KES ${Number(principal).toLocaleString()} has not been approved at this time.

If you have questions or would like to reapply, please contact your welfare administrator or visit:
${process.env.APP_URL}

Regards,
Crater SDA Welfare Society Team
    `.trim(),
  })
}

// ─── 7. Claim Approved ────────────────────────────────────────────────────────
const sendClaimApprovedEmail = async ({ email, fullName, claimType, claimTitle, amount }) => {
  await sendEmail({
    to:      email,
    subject: "Your Welfare Claim Has Been Approved",
    text: `
Hello ${fullName},

Great news! Your welfare claim has been reviewed and approved.

Claim Details:
  Type   : ${claimType}
  Title  : ${claimTitle}
  Amount : ${amount ? `KES ${Number(amount).toLocaleString()}` : "To be disbursed"}

The welfare team will process the disbursement shortly.

${process.env.APP_URL}

Regards,
Crater SDA Welfare Society Team
    `.trim(),
  })
}

// ─── 8. Claim Rejected ────────────────────────────────────────────────────────
const sendClaimRejectedEmail = async ({ email, fullName, claimType, claimTitle, reason }) => {
  await sendEmail({
    to:      email,
    subject: "Your Welfare Claim Was Not Approved",
    text: `
Hello ${fullName},

We regret to inform you that your welfare claim has not been approved at this time.

Claim Details:
  Type   : ${claimType}
  Title  : ${claimTitle}
  ${reason ? `Reason : ${reason}` : ""}

If you would like to appeal, please contact your welfare administrator or visit:
${process.env.APP_URL}

Regards,
Crater SDA Welfare Society Team
    `.trim(),
  })
}

// ─── 9. Annual Contribution Reminder ─────────────────────────────────────────
const sendContributionReminderEmail = async ({ email, fullName, annualRate, paidThisYear, shortfall, memberType }) => {
  await sendEmail({
    to:      email,
    subject: `Reminder: Annual Contribution Due by 31 March`,
    text: `
Hello ${fullName},

This is a reminder that your annual welfare contribution is due by 31 March.

Contribution Summary:
  Member Type       : ${memberType === "FAMILY" ? "Family Member" : "Single Member"}
  Annual Obligation : KES ${Number(annualRate).toLocaleString()}
  Paid So Far       : KES ${Number(paidThisYear).toLocaleString()}
  Outstanding       : KES ${Number(shortfall).toLocaleString()}

Please log in to make your payment before the 31 March deadline:
${process.env.APP_URL}

Regards,
Crater SDA Welfare Society Team
    `.trim(),
  })
}

// ─── 10. Announcement ────────────────────────────────────────────────────────
const sendAnnouncementEmail = async ({ email, fullName, title, content }) => {
  await sendEmail({
    to:      email,
    subject: `Announcement: ${title}`,
    text: `
Hello ${fullName},

There is a new announcement from the Crater SDA Welfare Society.

${title}
${"─".repeat(Math.min(title.length, 60))}
${content}

Log in to view all announcements:
${process.env.APP_URL}

Regards,
Crater SDA Welfare Society Team
    `.trim(),
  })
}

// ─── 11. Loan Repayment Confirmation ─────────────────────────────────────────
const sendRepaymentConfirmationEmail = async ({ email, fullName, amount, totalRepaid, totalDue, fullyPaid }) => {
  const remaining = Math.max(0, totalDue - totalRepaid)
  await sendEmail({
    to:      email,
    subject: fullyPaid ? "Congratulations! Your Loan Has Been Fully Paid" : "Loan Repayment Received",
    text: fullyPaid
      ? `
Hello ${fullName},

Congratulations! Your loan has been fully repaid.

Payment Summary:
  Last Payment  : KES ${Number(amount).toLocaleString()}
  Total Repaid  : KES ${Number(totalRepaid).toLocaleString()}
  Outstanding   : KES 0.00

Your loan account is now closed. Thank you for your commitment.

${process.env.APP_URL}

Regards,
Crater SDA Welfare Society Team
      `.trim()
      : `
Hello ${fullName},

Your loan repayment has been received.

Payment Summary:
  Amount Paid   : KES ${Number(amount).toLocaleString()}
  Total Repaid  : KES ${Number(totalRepaid).toLocaleString()}
  Outstanding   : KES ${Number(remaining).toLocaleString()}

${process.env.APP_URL}

Regards,
Crater SDA Welfare Society Team
      `.trim(),
  })
}

// ─── 12. OTP / 2FA ───────────────────────────────────────────────────────────
const sendOtpEmail = async ({ email, fullName, otp, expiryMins }) => {
  await sendEmail({
    to:      email,
    subject: `Your login verification code: ${otp}`,
    text: `
Hello ${fullName},

Your one-time verification code for Crater SDA Welfare Society is:

  ${otp}

This code is valid for ${expiryMins} minutes.
Do not share this code with anyone — our team will never ask for it.

If you did not request this code, please contact your welfare administrator immediately.

Regards,
Crater SDA Welfare Society Team
    `.trim(),
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <div style="background:#0f2040;border-radius:12px;padding:28px;text-align:center;margin-bottom:24px">
          <div style="font-size:32px;margin-bottom:8px">🔐</div>
          <div style="font-family:Georgia,serif;font-size:22px;color:#f5c842;font-weight:700">Crater SDA Welfare</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:4px;letter-spacing:0.1em;text-transform:uppercase">Verification Code</div>
        </div>
        <p style="font-size:15px;color:#374151;margin-bottom:8px">Hello <strong>${fullName}</strong>,</p>
        <p style="font-size:14px;color:#64748b;margin:0 0 20px">Your one-time login verification code is:</p>
        <div style="background:#f8fafc;border:2px solid #1e3a6e;border-radius:12px;padding:28px;text-align:center;margin:0 0 20px">
          <div style="font-size:44px;font-weight:700;letter-spacing:14px;color:#0f2040;font-family:monospace">${otp}</div>
        </div>
        <p style="font-size:13px;color:#64748b;margin:0 0 8px">
          ⏱ Valid for <strong>${expiryMins} minutes</strong>
        </p>
        <p style="font-size:13px;color:#94a3b8;margin:0 0 24px">
          🔒 Do not share this code with anyone. Our team will never ask for it.
        </p>
        <div style="background:#fef3c7;border-radius:8px;padding:12px 16px;font-size:13px;color:#92400e;margin-bottom:24px">
          ⚠️ If you did not request this code, contact your welfare administrator immediately.
        </div>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 16px"/>
        <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0">
          Crater SDA Welfare Society · Nakuru, Kenya
        </p>
      </div>
    `,
  })
  console.log(`✅ OTP email sent to ${email}`)
}

// ─── 13. Beneficiary Request Received ────────────────────────────────────────
const sendBeneficiaryRequestReceivedEmail = async ({ email, fullName, requestType }) => {
  if (!email) return
  const actionLabel = requestType === "ADD" ? "add a new beneficiary"
    : requestType === "UPDATE" ? "update a beneficiary"
    : "remove a beneficiary"
  await sendEmail({
    to:      email,
    subject: "Beneficiary change request received",
    text: `
Hello ${fullName},

Your request to ${actionLabel} has been received by the welfare secretary.

What happens next:
  - Your request will be reviewed within 2 working days.
  - You will be notified by email once it has been processed.
  - You can track the status of your request by logging into your dashboard.

If you did not submit this request, please contact your welfare administrator immediately.

${process.env.APP_URL}

Regards,
Crater SDA Welfare Society Team
    `.trim(),
  })
}

// ─── 14. Beneficiary Request Processed (Approved or Rejected) ────────────────
const sendBeneficiaryRequestProcessedEmail = async ({ email, fullName, requestType, status, dependentName, reason }) => {
  if (!email) return
  const approved    = status === "APPROVED"
  const actionLabel = requestType === "ADD" ? "add a beneficiary"
    : requestType === "UPDATE" ? "update a beneficiary"
    : "remove a beneficiary"

  await sendEmail({
    to:      email,
    subject: approved
      ? `Beneficiary request approved`
      : `Beneficiary request not approved`,
    text: approved
      ? `
Hello ${fullName},

Your request to ${actionLabel} has been approved and the change has been applied to your account.
${dependentName ? `\n  Beneficiary: ${dependentName}` : ""}

You can view your updated beneficiary list by logging into your dashboard:
${process.env.APP_URL}

Regards,
Crater SDA Welfare Society Team
      `.trim()
      : `
Hello ${fullName},

Your request to ${actionLabel} has not been approved at this time.
${reason ? `\nReason: ${reason}` : ""}

If you have questions or would like to resubmit, please contact your welfare administrator or visit:
${process.env.APP_URL}

Regards,
Crater SDA Welfare Society Team
      `.trim(),
  })
}

// ─── 15. Beneficiary Request Processed — SMS ─────────────────────────────────
const sendBeneficiaryRequestProcessedSMS = async ({ phone, fullName, requestType, status }) => {
  if (!phone) return
  const approved = status === "APPROVED"
  const msg = approved
    ? `Crater Welfare: Your beneficiary ${requestType.toLowerCase()} request has been approved. Log in to view your updated beneficiaries.`
    : `Crater Welfare: Your beneficiary ${requestType.toLowerCase()} request was not approved. Log in for details.`
  // TODO: replace with actual SMS client call when ready
  console.log(`📱 [SMS stub] To: ${phone} | Message: ${msg}`)
}

// ─── 16. Password Reset ───────────────────────────────────────────────────────
// Triggered by super admin on behalf of a member who has forgotten their password.
// The reset link is valid for 24 hours and is single-use (token cleared after use).
const sendPasswordResetEmail = async ({ email, fullName, token }) => {
  if (!email || !token) { console.error("❌ Missing email or reset token"); return }
  const resetLink = `${process.env.APP_URL}/reset-password?token=${token}`
  await sendEmail({
    to:      email,
    subject: "Reset your Welfare Account password",
    text: `
Hello ${fullName},

A password reset has been requested for your Crater SDA Welfare Society account.

To set a new password, please visit the link below:

${resetLink}

This link will expire in 24 hours and can only be used once.

If you did not request a password reset, please contact your welfare administrator immediately.

Regards,
Crater SDA Welfare Society Team
    `.trim(),
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <div style="background:#0f2040;border-radius:12px;padding:28px;text-align:center;margin-bottom:24px">
          <div style="font-size:32px;margin-bottom:8px">🔑</div>
          <div style="font-family:Georgia,serif;font-size:22px;color:#f5c842;font-weight:700">Crater SDA Welfare</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:4px;letter-spacing:0.1em;text-transform:uppercase">Password Reset</div>
        </div>
        <p style="font-size:15px;color:#374151;margin-bottom:8px">Hello <strong>${fullName}</strong>,</p>
        <p style="font-size:14px;color:#64748b;margin:0 0 24px">
          A password reset has been requested for your account. Click the button below to set a new password.
        </p>
        <div style="text-align:center;margin:0 0 24px">
          <a href="${resetLink}"
             style="display:inline-block;background:#1e3a6e;color:#ffffff;text-decoration:none;
                    padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">
            Reset My Password
          </a>
        </div>
        <p style="font-size:13px;color:#64748b;margin:0 0 8px">
          ⏱ This link expires in <strong>24 hours</strong> and can only be used once.
        </p>
        <p style="font-size:13px;color:#94a3b8;margin:0 0 16px">
          If the button doesn't work, copy and paste this link into your browser:
        </p>
        <p style="font-size:12px;color:#1e3a6e;word-break:break-all;margin:0 0 24px">${resetLink}</p>
        <div style="background:#fef3c7;border-radius:8px;padding:12px 16px;font-size:13px;color:#92400e;margin-bottom:24px">
          ⚠️ If you did not request this reset, contact your welfare administrator immediately.
        </div>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 16px"/>
        <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0">
          Crater SDA Welfare Society · Nakuru, Kenya
        </p>
      </div>
    `,
  })
  console.log(`✅ Password reset email sent to ${email}`)
}

// ─── 17. Account Status Change ────────────────────────────────────────────────
// Notifies the member whenever their account status is changed by the admin:
//   status: "ACTIVE" | "INACTIVE" | "ANONYMISED"
const sendAccountStatusEmail = async ({ email, fullName, status }) => {
  if (!email) return

  const statusConfig = {
    ACTIVE: {
      subject: "Your Welfare account has been activated",
      icon:    "✅",
      heading: "Account Activated",
      body: `Your Crater SDA Welfare Society account has been activated. You can now log in and access all member services.`,
      cta:     true,
    },
    INACTIVE: {
      subject: "Your Welfare account has been deactivated",
      icon:    "⏸️",
      heading: "Account Deactivated",
      body: `Your Crater SDA Welfare Society account has been temporarily deactivated by the administrator. You will not be able to log in until it is reactivated.\n\nIf you believe this is an error or would like to request reactivation, please contact your welfare administrator.`,
      cta:     false,
    },
    ANONYMISED: {
      subject: "Your Welfare account has been anonymised",
      icon:    "🔒",
      heading: "Account Anonymised",
      body: `As requested, your personal information has been removed from the Crater SDA Welfare Society system. This action is permanent and your account can no longer be restored.\n\nThank you for being a member of Crater SDA Welfare Society.`,
      cta:     false,
    },
  }

  const config = statusConfig[status]
  if (!config) { console.error("❌ Unknown account status:", status); return }

  await sendEmail({
    to:      email,
    subject: config.subject,
    text: `
Hello ${fullName},

${config.body}

${config.cta ? `Log in to your account:\n${process.env.APP_URL}\n` : ""}
Regards,
Crater SDA Welfare Society Team
    `.trim(),
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <div style="background:#0f2040;border-radius:12px;padding:28px;text-align:center;margin-bottom:24px">
          <div style="font-size:32px;margin-bottom:8px">${config.icon}</div>
          <div style="font-family:Georgia,serif;font-size:22px;color:#f5c842;font-weight:700">Crater SDA Welfare</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:4px;letter-spacing:0.1em;text-transform:uppercase">${config.heading}</div>
        </div>
        <p style="font-size:15px;color:#374151;margin-bottom:16px">Hello <strong>${fullName}</strong>,</p>
        <p style="font-size:14px;color:#64748b;margin:0 0 24px;white-space:pre-line">${config.body}</p>
        ${config.cta ? `
        <div style="text-align:center;margin:0 0 24px">
          <a href="${process.env.APP_URL}"
             style="display:inline-block;background:#1e3a6e;color:#ffffff;text-decoration:none;
                    padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">
            Log In Now
          </a>
        </div>` : ""}
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 16px"/>
        <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0">
          Crater SDA Welfare Society · Nakuru, Kenya
        </p>
      </div>
    `,
  })
  console.log(`✅ Account status email (${status}) sent to ${email}`)
}

// ─── Exports ──────────────────────────────────────────────────────────────────
module.exports = {
  sendActivationEmail,
  sendPaymentApprovedEmail,
  sendPaymentRejectedEmail,
  sendContributionApprovedEmail,
  sendLoanApprovedEmail,
  sendLoanRejectedEmail,
  sendClaimApprovedEmail,
  sendClaimRejectedEmail,
  sendContributionReminderEmail,
  sendAnnouncementEmail,
  sendRepaymentConfirmationEmail,
  sendOtpEmail,
  sendBeneficiaryRequestReceivedEmail,
  sendBeneficiaryRequestProcessedEmail,
  sendBeneficiaryRequestProcessedSMS,
  // ── NEW ──
  sendPasswordResetEmail,
  sendAccountStatusEmail,
}