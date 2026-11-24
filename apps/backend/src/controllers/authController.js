const prisma = require("../lib/prisma")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const crypto = require("crypto")

const { sendOtpEmail } = require("../services/emailService")
const { sendOtpSMS } = require("../services/smsService")
const policy = require("../lib/adminPolicy")

const { ADMIN_ROLES, MAX_FAILED_LOGINS, LOCK_MINUTES, MAX_OTP_ATTEMPTS } = policy
const OTP_EXPIRY_MINS = 10
const OTP_LENGTH = 6
const INVALID = "Invalid email or password"
const DUMMY_HASH = bcrypt.hashSync(crypto.randomBytes(8).toString("hex"), 10)

const isAdminRole = (role) => ADMIN_ROLES.includes(role)
const generateOTP = () => crypto.randomInt(100000, 999999).toString().padStart(OTP_LENGTH, "0")
const otpExpiry = () => new Date(Date.now() + OTP_EXPIRY_MINS * 60 * 1000)

// Short-lived token that only carries the user id between /login and /verify-otp
const signOtpToken = (userId) =>
  jwt.sign({ otpUserId: userId, aud: "admin-otp" }, process.env.JWT_SECRET, { expiresIn: `${OTP_EXPIRY_MINS}m` })

const signAuthToken = (user) =>
  jwt.sign(
    { id: user.id, role: user.role, email: user.email, type: isAdminRole(user.role) ? "admin" : "member", tv: user.tokenVersion || 0 },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  )

const safeUser = (u) => ({
  id: u.id,
  fullName: u.fullName,
  email: u.email,
  role: u.role,
  type: isAdminRole(u.role) ? "admin" : "member",
  isPrimary: !!u.isPrimary,
  mustChangePassword: !!u.mustChangePassword,
  memberNumber: u.memberNumber,
  nationalId: u.nationalId,
  phone: u.phone,
  isActive: u.isActive,
  memberType: u.memberType,
  monthlyRate: u.monthlyRate,
})

const audit = (userId, action, details) =>
  prisma.auditLog
    .create({ data: { action, entity: "User", entityId: userId, userId, details } })
    .catch((e) => console.error("Audit log failed:", e.message))

const maskEmail = (e) => e.replace(/(.{2})(.*)(@.*)/, "$1***$3")
const maskPhone = (p) => (p ? p.replace(/(\d{4})(\d+)(\d{2})/, "$1****$3") : null)

async function registerFailure(user) {
  const attempts = (user.failedLoginAttempts || 0) + 1
  const lock = attempts >= MAX_FAILED_LOGINS
  await prisma.user
    .update({
      where: { id: user.id },
      data: { failedLoginAttempts: lock ? 0 : attempts, ...(lock && { lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60 * 1000) }) },
    })
    .catch(() => {})
  if (lock) audit(user.id, "ACCOUNT_LOCKED", `Locked for ${LOCK_MINUTES} minutes after ${MAX_FAILED_LOGINS} failed attempts`)
}

async function issueOtp(user, isResend) {
  const otp = generateOTP()
  await prisma.user.update({
    where: { id: user.id },
    data: { otpCode: await bcrypt.hash(otp, 10), otpExpiry: otpExpiry(), otpAttempts: 0 },
  })
  const name = (user.fullName || "").split(" ")[0]
  const message = `Your ${isResend ? "new " : ""}Crater SDA Welfare login OTP is: ${otp}. Valid for ${OTP_EXPIRY_MINS} minutes. Do not share this code.`
  Promise.allSettled([
    sendOtpEmail({ email: user.email, fullName: name, otp, expiryMins: OTP_EXPIRY_MINS }),
    sendOtpSMS({ phone: user.phone, message }),
  ]).then((results) => {
    const bad = results.filter((r) => r.status === "rejected").length
    if (bad > 0) console.warn(`OTP delivery: ${results.length - bad} succeeded, ${bad} failed for ${user.email}`)
  })
}

// ---- Shared login for both portals --------------------------------------------------
const loginHandler = (audience) => async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim()
    const password = String(req.body?.password || "")
    if (!email || !password) return res.status(400).json({ message: "Email and password are required" })
    if (!process.env.JWT_SECRET) return res.status(500).json({ message: "Server configuration error" })

    const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } })
    if (!user) {
      await bcrypt.compare(password, DUMMY_HASH) // equalise timing
      return res.status(401).json({ message: INVALID })
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const mins = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000)
      return res.status(423).json({ message: `Too many failed attempts. Try again in ${mins} minute(s).`, locked: true })
    }

    if (!user.password) {
      if (!user.isActive)
        return res.status(403).json({ message: "Account not activated. Please check your email for the activation link.", activated: false })
      return res.status(403).json({ message: "Password not set. Please activate your account via the email link." })
    }

    const match = await bcrypt.compare(password, user.password)
    if (!match) {
      await registerFailure(user)
      return res.status(401).json({ message: INVALID })
    }

    if (user.accountStatus !== "ACTIVE")
      return res.status(403).json({ message: "This account has been deactivated. Please contact the welfare administrator." })
    if (!user.isActive)
      return res.status(403).json({ message: "Account not activated. Please check your email for the activation link.", activated: false })

    const admin = isAdminRole(user.role)
    if (audience === "admin" && !admin)
      return res.status(403).json({ message: "This portal is for administrators only. Please use the member sign-in page." })
    if (audience === "member" && admin)
      return res.status(403).json({ message: "Administrator accounts must sign in through the admin portal.", useAdminPortal: true })

    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0, lockedUntil: null } }).catch(() => {})
    }

    if (admin) {
      await issueOtp(user, false)
      return res.json({
        requiresOtp: true,
        otpToken: signOtpToken(user.id),
        message: `A 6-digit OTP has been sent to your phone and email. Valid for ${OTP_EXPIRY_MINS} minutes.`,
        maskedEmail: maskEmail(user.email),
        maskedPhone: maskPhone(user.phone),
      })
    }

    res.json({ requiresOtp: false, message: "Login successful", token: signAuthToken(user), user: safeUser(user) })
  } catch (error) {
    console.error("Login error:", error.message)
    res.status(500).json({ message: "Login failed. Please try again." })
  }
}
exports.login = loginHandler("member")
exports.adminLogin = loginHandler("admin")

// ---- POST /api/auth/verify-otp ------------------------------------------------------
exports.verifyOtp = async (req, res) => {
  try {
    const { otpToken, otp } = req.body || {}
    if (!otpToken || !otp) return res.status(400).json({ message: "OTP token and code are required" })

    let payload
    try { payload = jwt.verify(otpToken, process.env.JWT_SECRET) }
    catch { return res.status(401).json({ message: "OTP session expired. Please log in again.", expired: true }) }
    if (!payload.otpUserId || payload.aud !== "admin-otp") return res.status(401).json({ message: "Invalid OTP token" })

    const user = await prisma.user.findUnique({ where: { id: payload.otpUserId } })
    if (!user || !isAdminRole(user.role)) return res.status(401).json({ message: "Invalid OTP token" })
    if (user.accountStatus !== "ACTIVE" || !user.isActive) return res.status(403).json({ message: "This account has been deactivated." })
    if (!user.otpCode || !user.otpExpiry) return res.status(400).json({ message: "No OTP found. Please log in again.", expired: true })
    if (new Date() > user.otpExpiry) return res.status(400).json({ message: "OTP has expired. Please log in again.", expired: true })
    if ((user.otpAttempts || 0) >= MAX_OTP_ATTEMPTS) {
      await prisma.user.update({ where: { id: user.id }, data: { otpCode: null, otpExpiry: null } })
      return res.status(429).json({ message: "Too many incorrect attempts. Please log in again.", expired: true })
    }

    const ok = await bcrypt.compare(String(otp).trim(), user.otpCode)
    if (!ok) {
      const attempts = (user.otpAttempts || 0) + 1
      const burn = attempts >= MAX_OTP_ATTEMPTS
      await prisma.user.update({
        where: { id: user.id },
        data: { otpAttempts: attempts, ...(burn && { otpCode: null, otpExpiry: null }) },
      })
      if (burn) return res.status(429).json({ message: "Too many incorrect attempts. Please log in again.", expired: true })
      return res.status(400).json({ message: `Incorrect OTP. ${MAX_OTP_ATTEMPTS - attempts} attempt(s) left.` })
    }

    await prisma.user.update({ where: { id: user.id }, data: { otpCode: null, otpExpiry: null, otpAttempts: 0 } })
    audit(user.id, "LOGIN", undefined)
    res.json({ message: "Login successful", token: signAuthToken(user), user: safeUser(user) })
  } catch (error) {
    console.error("verifyOtp error:", error.message)
    res.status(500).json({ message: "Verification failed. Please try again." })
  }
}

// ---- POST /api/auth/resend-otp ------------------------------------------------------
exports.resendOtp = async (req, res) => {
  try {
    const { otpToken } = req.body || {}
    if (!otpToken) return res.status(400).json({ message: "OTP token required" })
    let payload
    try { payload = jwt.verify(otpToken, process.env.JWT_SECRET) }
    catch { return res.status(401).json({ message: "Session expired. Please log in again.", expired: true }) }
    if (!payload.otpUserId || payload.aud !== "admin-otp") return res.status(401).json({ message: "Invalid OTP token" })

    const user = await prisma.user.findUnique({ where: { id: payload.otpUserId } })
    if (!user || !isAdminRole(user.role) || user.accountStatus !== "ACTIVE") return res.status(404).json({ message: "User not found" })

    if (user.otpExpiry) {
      const msRemaining = user.otpExpiry.getTime() - Date.now()
      if (msRemaining > OTP_EXPIRY_MINS * 60 * 1000 - 60000)
        return res.status(429).json({ message: "Please wait 1 minute before requesting a new OTP." })
    }
    await issueOtp(user, true)
    res.json({ message: "New OTP sent to your phone and email.", otpToken: signOtpToken(user.id) })
  } catch (error) {
    console.error("resendOtp error:", error.message)
    res.status(500).json({ message: "Could not resend OTP. Please try again." })
  }
}

// ---- POST /api/auth/activate (members) ----------------------------------------------
exports.activateAccount = async (req, res) => {
  try {
    const { token, password } = req.body || {}
    if (!token || !password) return res.status(400).json({ message: "Token and password are required" })
    if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters" })

    const user = await prisma.user.findFirst({ where: { activationToken: token } })
    if (!user) return res.status(400).json({ message: "Invalid or expired activation token" })
    if (user.isActive) return res.status(400).json({ message: "Account is already activated" })
    if (isAdminRole(user.role)) return res.status(400).json({ message: "Invalid or expired activation token" })

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash(password, await bcrypt.genSalt(10)), isActive: true, activationToken: null },
    })
    res.json({ message: "Account activated successfully.", token: signAuthToken(updated), user: safeUser(updated) })
  } catch (error) {
    console.error("activateAccount error:", error.message)
    res.status(500).json({ message: "Activation failed. Please try again." })
  }
}

// ---- Admin invitations (public, token-based) ----------------------------------------
const findInviteUser = (token) => {
  if (typeof token !== "string" || token.length < 20 || token.length > 200) return null
  return prisma.user.findFirst({
    where: { inviteTokenHash: policy.sha256(token), inviteExpiry: { gt: new Date() }, mustChangePassword: true, accountStatus: "ACTIVE" },
  })
}

exports.getAdminInvite = async (req, res) => {
  try {
    const user = await findInviteUser(req.params.token)
    if (!user) return res.status(404).json({ message: "This invitation is invalid or has expired. Ask your super admin to send a new one." })
    res.json({ fullName: user.fullName, role: policy.roleLabel(user), email: maskEmail(user.email) })
  } catch (error) {
    console.error("getAdminInvite error:", error.message)
    res.status(500).json({ message: "Could not load invitation." })
  }
}

exports.acceptAdminInvite = async (req, res) => {
  try {
    const { token, tempPassword, newPassword } = req.body || {}
    if (!token || !tempPassword || !newPassword) return res.status(400).json({ message: "Token, temporary password and new password are required" })
    const problem = policy.validateAdminPassword(newPassword)
    if (problem) return res.status(400).json({ message: problem })
    if (tempPassword === newPassword) return res.status(400).json({ message: "Your new password must be different from the temporary password" })

    const user = await findInviteUser(token)
    if (!user) return res.status(400).json({ message: "This invitation is invalid or has expired. Ask your super admin to send a new one." })
    if (user.lockedUntil && user.lockedUntil > new Date())
      return res.status(423).json({ message: "Too many failed attempts. Try again later.", locked: true })

    const ok = await bcrypt.compare(String(tempPassword), user.password || DUMMY_HASH)
    if (!ok) {
      await registerFailure(user)
      return res.status(401).json({ message: "The temporary password is incorrect" })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: await bcrypt.hash(newPassword, 10),
        mustChangePassword: false, inviteTokenHash: null, inviteExpiry: null,
        tokenVersion: { increment: 1 }, failedLoginAttempts: 0, lockedUntil: null,
      },
    })
    audit(user.id, "ADMIN_INVITE_ACCEPTED", undefined)
    res.json({ message: "Password set. You can now sign in to the admin portal." })
  } catch (error) {
    console.error("acceptAdminInvite error:", error.message)
    res.status(500).json({ message: "Could not complete setup. Please try again." })
  }
}

// ---- GET /api/auth/profile ----------------------------------------------------------
exports.getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, fullName: true, email: true, phone: true, nationalId: true, memberNumber: true, role: true,
        isActive: true, groupId: true, memberType: true, monthlyRate: true, createdAt: true, updatedAt: true,
        isPrimary: true, mustChangePassword: true,
      },
    })
    if (!user) return res.status(404).json({ message: "User not found" })
    res.json({ user: { ...user, type: isAdminRole(user.role) ? "admin" : "member" } })
  } catch (error) {
    console.error("getProfile error:", error.message)
    res.status(500).json({ message: "Could not load profile." })
  }
}

// ---- PUT /api/auth/change-password --------------------------------------------------
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {}
    if (!currentPassword || !newPassword) return res.status(400).json({ message: "Current and new password are required" })

    const admin = isAdminRole(req.user.role)
    if (admin) {
      const problem = policy.validateAdminPassword(newPassword)
      if (problem) return res.status(400).json({ message: problem })
    } else if (newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters" })
    }
    if (currentPassword === newPassword) return res.status(400).json({ message: "New password must be different from the current one" })

    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    if (!user?.password) return res.status(404).json({ message: "User not found" })
    if (!(await bcrypt.compare(currentPassword, user.password)))
      return res.status(401).json({ message: "Current password is incorrect" })

    // Admin sessions are rotated (tokenVersion) - a fresh token is returned. Member behaviour is unchanged.
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: await bcrypt.hash(newPassword, await bcrypt.genSalt(10)),
        mustChangePassword: false, inviteTokenHash: null, inviteExpiry: null,
        ...(admin && { tokenVersion: { increment: 1 } }),
      },
    })
    audit(user.id, "PASSWORD_CHANGE", undefined)
    res.json({ message: "Password changed successfully", token: signAuthToken(updated), user: safeUser(updated) })
  } catch (error) {
    console.error("changePassword error:", error.message)
    res.status(500).json({ message: "Could not change password." })
  }
}
