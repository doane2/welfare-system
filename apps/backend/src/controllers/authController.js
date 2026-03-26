const prisma  = require("../lib/prisma")
const bcrypt  = require("bcrypt")
const jwt     = require("jsonwebtoken")
const crypto  = require("crypto")

// ── Services ──────────────────────────────────────────────────────────────────
const { sendOtpEmail }  = require("../services/emailService")
const { sendOtpSMS }    = require("../services/smsService")

// ── Config ────────────────────────────────────────────────────────────────────
const ADMIN_ROLES      = ["SUPER_ADMIN", "TREASURER", "SECRETARY"]
const OTP_EXPIRY_MINS  = 10
const OTP_LENGTH       = 6

// ── Helpers ───────────────────────────────────────────────────────────────────
const generateOTP = () =>
  crypto.randomInt(100000, 999999).toString().padStart(OTP_LENGTH, "0")

const otpExpiry = () =>
  new Date(Date.now() + OTP_EXPIRY_MINS * 60 * 1000)

// Short-lived token used only to carry the user id between
// the /login step and the /verify-otp step (no role inside — not usable as auth)
const signOtpToken = (userId) =>
  jwt.sign({ otpUserId: userId }, process.env.JWT_SECRET, { expiresIn: `${OTP_EXPIRY_MINS}m` })

// Full auth token issued after successful OTP verification (or for members who skip 2FA)
const signAuthToken = (user) =>
  jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  )

const safeUser = (u) => ({
  id:           u.id,
  fullName:     u.fullName,
  email:        u.email,
  role:         u.role,
  memberNumber: u.memberNumber,
  nationalId:   u.nationalId,
  phone:        u.phone,
  isActive:     u.isActive,
  memberType:   u.memberType,
  monthlyRate:  u.monthlyRate,
})

// ── POST /api/auth/login ──────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required" })

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user)
      return res.status(401).json({ message: "Invalid email or password" })

    if (!user.isActive)
      return res.status(403).json({
        message:   "Account not activated. Please check your email for the activation link.",
        activated: false,
      })

    if (!user.password)
      return res.status(403).json({ message: "Password not set. Please activate your account via the email link." })

    const match = await bcrypt.compare(password, user.password)
    if (!match)
      return res.status(401).json({ message: "Invalid email or password" })

    if (!process.env.JWT_SECRET)
      return res.status(500).json({ message: "Server configuration error" })

    // ── 2FA for admins ───────────────────────────────────────────────────────
    if (ADMIN_ROLES.includes(user.role)) {
      const otp     = generateOTP()
      const expiry  = otpExpiry()
      const hashed  = await bcrypt.hash(otp, 10)

      // Store hashed OTP + expiry on the user record
      await prisma.user.update({
        where: { id: user.id },
        data:  { otpCode: hashed, otpExpiry: expiry },
      })

      // Send OTP via SMS + email simultaneously
      const name    = user.fullName.split(" ")[0]
      const message = `Your Crater SDA Welfare login OTP is: ${otp}. Valid for ${OTP_EXPIRY_MINS} minutes. Do not share this code.`

      Promise.allSettled([
        sendOtpEmail({ email: user.email, fullName: name, otp, expiryMins: OTP_EXPIRY_MINS }),
        sendOtpSMS({ phone: user.phone, message }),
      ]).then(results => {
        const ok  = results.filter(r => r.status === "fulfilled").length
        const bad = results.filter(r => r.status === "rejected").length
        if (bad > 0) console.warn(`⚠️ OTP delivery: ${ok} succeeded, ${bad} failed for ${user.email}`)
        else         console.log(`✅ OTP sent to ${user.email} via SMS + email`)
      })

      // Return a short-lived OTP token — NOT a full auth token
      return res.json({
        requiresOtp: true,
        otpToken:    signOtpToken(user.id),
        message:     `A 6-digit OTP has been sent to your phone and email. Valid for ${OTP_EXPIRY_MINS} minutes.`,
        // Show masked delivery info so user knows where to look
        maskedEmail: user.email.replace(/(.{2})(.*)(@.*)/, "$1***$3"),
        maskedPhone: user.phone ? user.phone.replace(/(\d{4})(\d+)(\d{2})/, "$1****$3") : null,
      })
    }

    // ── Members — direct login (no 2FA) ──────────────────────────────────────
    const token = signAuthToken(user)
    console.log(`✅ Member logged in: ${user.email}`)

    res.json({
      requiresOtp: false,
      message:     "Login successful",
      token,
      user:        safeUser(user),
    })

  } catch (error) {
    console.error("❌ Login error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ── POST /api/auth/verify-otp ─────────────────────────────────────────────────
exports.verifyOtp = async (req, res) => {
  try {
    const { otpToken, otp } = req.body

    if (!otpToken || !otp)
      return res.status(400).json({ message: "OTP token and code are required" })

    // Verify the short-lived OTP token
    let payload
    try {
      payload = jwt.verify(otpToken, process.env.JWT_SECRET)
    } catch {
      return res.status(401).json({ message: "OTP session expired. Please log in again.", expired: true })
    }

    if (!payload.otpUserId)
      return res.status(401).json({ message: "Invalid OTP token" })

    const user = await prisma.user.findUnique({ where: { id: payload.otpUserId } })
    if (!user)
      return res.status(404).json({ message: "User not found" })

    // Check OTP exists and not expired
    if (!user.otpCode || !user.otpExpiry)
      return res.status(400).json({ message: "No OTP found. Please log in again." })

    if (new Date() > user.otpExpiry)
      return res.status(400).json({ message: "OTP has expired. Please log in again.", expired: true })

    // Verify OTP
    const otpMatch = await bcrypt.compare(otp.trim(), user.otpCode)
    if (!otpMatch)
      return res.status(400).json({ message: "Incorrect OTP. Please try again." })

    // Clear OTP from DB — single use
    await prisma.user.update({
      where: { id: user.id },
      data:  { otpCode: null, otpExpiry: null },
    })

    // Issue full auth token
    const token = signAuthToken(user)

    await prisma.auditLog.create({
      data: { action: "LOGIN", entity: "User", entityId: user.id, userId: user.id }
    }).catch(() => {})

    console.log(`✅ 2FA verified — ${user.email} | Role: ${user.role}`)

    res.json({
      message: "Login successful",
      token,
      user:    safeUser(user),
    })

  } catch (error) {
    console.error("❌ verifyOtp error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ── POST /api/auth/resend-otp ─────────────────────────────────────────────────
exports.resendOtp = async (req, res) => {
  try {
    const { otpToken } = req.body
    if (!otpToken)
      return res.status(400).json({ message: "OTP token required" })

    let payload
    try {
      payload = jwt.verify(otpToken, process.env.JWT_SECRET)
    } catch {
      return res.status(401).json({ message: "Session expired. Please log in again.", expired: true })
    }

    const user = await prisma.user.findUnique({ where: { id: payload.otpUserId } })
    if (!user) return res.status(404).json({ message: "User not found" })

    // Rate limit — don't allow resend if previous OTP is less than 1 minute old
    if (user.otpExpiry) {
      const msRemaining = user.otpExpiry.getTime() - Date.now()
      const msTotal     = OTP_EXPIRY_MINS * 60 * 1000
      if (msRemaining > msTotal - 60000) {
        return res.status(429).json({ message: "Please wait 1 minute before requesting a new OTP." })
      }
    }

    const otp    = generateOTP()
    const expiry = otpExpiry()
    const hashed = await bcrypt.hash(otp, 10)

    await prisma.user.update({
      where: { id: user.id },
      data:  { otpCode: hashed, otpExpiry: expiry },
    })

    const name    = user.fullName.split(" ")[0]
    const message = `Your new Crater SDA Welfare OTP is: ${otp}. Valid for ${OTP_EXPIRY_MINS} minutes.`

    Promise.allSettled([
      sendOtpEmail({ email: user.email, fullName: name, otp, expiryMins: OTP_EXPIRY_MINS }),
      sendOtpSMS({ phone: user.phone, message }),
    ])

    // Issue a new OTP token with fresh expiry
    res.json({
      message:  "New OTP sent to your phone and email.",
      otpToken: signOtpToken(user.id),
    })

  } catch (error) {
    console.error("❌ resendOtp error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ── POST /api/auth/activate ───────────────────────────────────────────────────
exports.activateAccount = async (req, res) => {
  try {
    const { token, password } = req.body
    if (!token || !password)
      return res.status(400).json({ message: "Token and password are required" })
    if (password.length < 8)
      return res.status(400).json({ message: "Password must be at least 8 characters" })

    const user = await prisma.user.findFirst({ where: { activationToken: token } })
    if (!user)
      return res.status(400).json({ message: "Invalid or expired activation token" })
    if (user.isActive)
      return res.status(400).json({ message: "Account is already activated" })

    const hashed     = await bcrypt.hash(password, await bcrypt.genSalt(10))
    const updated    = await prisma.user.update({
      where: { id: user.id },
      data:  { password: hashed, isActive: true, activationToken: null },
    })

    const jwtToken = signAuthToken(updated)
    console.log(`✅ Account activated: ${updated.email}`)

    res.json({
      message: "Account activated successfully.",
      token:   jwtToken,
      user:    safeUser(updated),
    })
  } catch (error) {
    console.error("❌ activateAccount error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ── GET /api/auth/profile ─────────────────────────────────────────────────────
exports.getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: req.user.id },
      select: {
        id:true, fullName:true, email:true, phone:true,
        nationalId:true, memberNumber:true, role:true,
        isActive:true, groupId:true, memberType:true,
        monthlyRate:true, createdAt:true, updatedAt:true,
      },
    })
    if (!user) return res.status(404).json({ message: "User not found" })
    res.json({ user })
  } catch (error) {
    console.error("❌ getProfile error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ── PUT /api/auth/change-password ─────────────────────────────────────────────
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: "Current and new password are required" })
    if (newPassword.length < 8)
      return res.status(400).json({ message: "New password must be at least 8 characters" })

    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    if (!user?.password) return res.status(404).json({ message: "User not found" })

    const match = await bcrypt.compare(currentPassword, user.password)
    if (!match) return res.status(401).json({ message: "Current password is incorrect" })

    await prisma.user.update({
      where: { id: req.user.id },
      data:  { password: await bcrypt.hash(newPassword, await bcrypt.genSalt(10)) },
    })

    await prisma.auditLog.create({
      data: { action:"PASSWORD_CHANGE", entity:"User", entityId:req.user.id, userId:req.user.id }
    }).catch(() => {})

    console.log(`✅ Password changed: ${user.email}`)
    res.json({ message: "Password changed successfully" })
  } catch (error) {
    console.error("❌ changePassword error:", error.message)
    res.status(500).json({ error: error.message })
  }
}