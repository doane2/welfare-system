const prisma = require("../lib/prisma")
const bcrypt = require("bcrypt")
const { sendOtpSMS } = require("../services/smsService")
const { sendAdminInviteEmail } = require("../services/adminMailer")
const policy = require("../lib/adminPolicy")

const { ADMIN_ROLES, ROLE_LIMITS } = policy
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RX = /^\+?\d{9,15}$/
const clean = (v) => (typeof v === "string" ? v.trim() : "")
const normPhone = (v) => clean(v).replace(/[\s()-]/g, "")

const SELECT = {
  id: true, fullName: true, email: true, phone: true, role: true, isPrimary: true, isActive: true,
  accountStatus: true, mustChangePassword: true, inviteExpiry: true, deactivatedAt: true,
  createdAt: true, updatedAt: true, createdByAdmin: { select: { id: true, fullName: true } },
}

class PolicyError extends Error {
  constructor(status, message) { super(message); this.status = status }
}
const fail = (res, e, label) => {
  if (e instanceof PolicyError) return res.status(e.status).json({ message: e.message })
  console.error(`${label} error:`, e.message)
  return res.status(500).json({ message: "Something went wrong. Please try again." })
}

const audit = (userId, action, entityId, details) =>
  prisma.auditLog
    .create({ data: { action, entity: "Admin", entityId, userId, details } })
    .catch((e) => console.error("Audit log failed:", e.message))

// Serialises concurrent admin changes so role limits can never be exceeded by a race
const lockAdmins = (tx) => tx.$queryRaw`SELECT "id" FROM "User" WHERE "isPrimary" = true FOR UPDATE`

async function assertCapacity(tx, role, excludeId) {
  const used = await tx.user.count({ where: { role, accountStatus: "ACTIVE", ...(excludeId && { id: { not: excludeId } }) } })
  if (used >= ROLE_LIMITS[role]) {
    const noun = role === "SUPER_ADMIN" ? "super admins (including the primary)" : `${policy.ROLE_LABELS[role].toLowerCase()}s`
    throw new PolicyError(409, `Limit reached: at most ${ROLE_LIMITS[role]} active ${noun} are allowed. Deactivate one first.`)
  }
}

function present(u, actor) {
  const status =
    u.accountStatus !== "ACTIVE" ? "DEACTIVATED"
    : u.mustChangePassword ? (u.inviteExpiry && u.inviteExpiry < new Date() ? "INVITE_EXPIRED" : "INVITE_PENDING")
    : "ACTIVE"
  return { ...u, label: policy.roleLabel(u), status, canManage: policy.canManage(actor, u).ok }
}

async function loadAdmin(id) {
  const t = await prisma.user.findUnique({ where: { id } })
  if (!t || !ADMIN_ROLES.includes(t.role)) throw new PolicyError(404, "Administrator not found")
  return t
}
function guard(actor, target) {
  const c = policy.canManage(actor, target)
  if (!c.ok) throw new PolicyError(403, c.reason)
}

async function deliverCredentials(admin, tempPassword, inv) {
  const inviteLink = `${policy.frontendUrl()}/admin/accept-invite?token=${inv.token}`
  const label = policy.roleLabel(admin)
  // Send on every channel that is available: email (needs the provider key) and SMS (needs a phone number)
  const emailAvailable = !!process.env.RESEND_API_KEY && !!admin.email
  const smsAvailable = !!admin.phone
  const sms = `Crater SDA Welfare: your ${label} account is ready. Temporary password: ${tempPassword} Set your own password here (valid ${policy.INVITE_EXPIRY_HOURS}h): ${inviteLink} Never share this.`
  const [e, s] = await Promise.allSettled([
    emailAvailable
      ? sendAdminInviteEmail({ email: admin.email, fullName: admin.fullName, roleLabel: label, inviteLink, tempPassword, expiryHours: policy.INVITE_EXPIRY_HOURS })
      : Promise.reject(new Error("Email not configured")),
    smsAvailable ? sendOtpSMS({ phone: admin.phone, message: sms }) : Promise.reject(new Error("No phone number")),
  ])
  if (e.status === "rejected") console.warn("Invite email not sent:", e.reason?.message)
  if (s.status === "rejected") console.warn("Invite SMS not sent:", s.reason?.message)
  const delivery = { email: e.status === "fulfilled", sms: s.status === "fulfilled" }
  const out = { delivery }
  // Credentials are revealed to the super admin only when NO channel delivered them
  if (!delivery.email && !delivery.sms) out.manualCredentials = { tempPassword, inviteLink, expiresAt: inv.expiry }
  return out
}

// ---- GET /api/admin-users -----------------------------------------------------------
exports.listAdmins = async (req, res) => {
  try {
    const admins = await prisma.user.findMany({
      where: { role: { in: ADMIN_ROLES } }, select: SELECT, orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    })
    const limits = {}
    for (const r of ADMIN_ROLES) limits[r] = { max: ROLE_LIMITS[r], used: admins.filter((a) => a.role === r && a.accountStatus === "ACTIVE").length }
    res.json({ admins: admins.map((a) => present(a, req.user)), limits, viewerIsPrimary: !!req.user.isPrimary })
  } catch (e) { fail(res, e, "listAdmins") }
}

// ---- POST /api/admin-users ----------------------------------------------------------
exports.createAdmin = async (req, res) => {
  try {
    const fullName = clean(req.body?.fullName)
    const email = clean(req.body?.email).toLowerCase()
    const phone = normPhone(req.body?.phone)
    const role = req.body?.role

    if (fullName.length < 2) throw new PolicyError(400, "Full name is required")
    if (!EMAIL_RX.test(email)) throw new PolicyError(400, "A valid email address is required")
    if (!PHONE_RX.test(phone)) throw new PolicyError(400, "A valid phone number is required (used for the temporary password and OTP)")
    if (!ADMIN_ROLES.includes(role)) throw new PolicyError(400, "Role must be SUPER_ADMIN, TREASURER or SECRETARY")
    if (role === "SUPER_ADMIN" && !req.user.isPrimary && !policy.PLATFORM_ADMINS_CAN_MANAGE_PLATFORM_ADMINS)
      throw new PolicyError(403, "Only the primary super admin can add platform admins.")

    const existing = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { role: true } })
    if (existing)
      throw new PolicyError(409, existing.role === "MEMBER"
        ? "This email belongs to a member account. Use a different email for the administrator account."
        : "An account with this email already exists.")

    const tempPassword = policy.generateTempPassword()
    const inv = policy.newInviteToken()
    const passwordHash = await bcrypt.hash(tempPassword, 10)

    const created = await prisma.$transaction(async (tx) => {
      await lockAdmins(tx)
      await assertCapacity(tx, role)
      return tx.user.create({
        data: {
          fullName, email, phone, role, password: passwordHash, isActive: true, accountStatus: "ACTIVE",
          mustChangePassword: true, inviteTokenHash: inv.hash, inviteExpiry: inv.expiry, createdByAdminId: req.user.id,
        },
        select: { ...SELECT, password: false },
      })
    }, { maxWait: 10000, timeout: 20000 })

    const full = await prisma.user.findUnique({ where: { id: created.id } })
    const delivery = await deliverCredentials(full, tempPassword, inv)
    audit(req.user.id, "CREATE_ADMIN", created.id, `${policy.roleLabel(created)}: ${email}`)
    res.status(201).json({ message: "Administrator created", admin: present(created, req.user), ...delivery })
  } catch (e) { fail(res, e, "createAdmin") }
}

// ---- PATCH /api/admin-users/:id -----------------------------------------------------
exports.updateAdmin = async (req, res) => {
  try {
    const target = await loadAdmin(req.params.id)
    guard(req.user, target)
    const data = {}
    if (req.body?.fullName !== undefined) {
      const n = clean(req.body.fullName)
      if (n.length < 2) throw new PolicyError(400, "Full name is required")
      data.fullName = n
    }
    if (req.body?.phone !== undefined) {
      const p = normPhone(req.body.phone)
      if (!PHONE_RX.test(p)) throw new PolicyError(400, "A valid phone number is required")
      data.phone = p
    }
    const role = req.body?.role
    const roleChange = role && role !== target.role
    if (roleChange) {
      if (!ADMIN_ROLES.includes(role)) throw new PolicyError(400, "Invalid role")
      if (role === "SUPER_ADMIN" && !req.user.isPrimary && !policy.PLATFORM_ADMINS_CAN_MANAGE_PLATFORM_ADMINS)
        throw new PolicyError(403, "Only the primary super admin can create platform admins.")
      data.role = role
      data.tokenVersion = { increment: 1 }
    }
    if (!Object.keys(data).length) throw new PolicyError(400, "Nothing to update")

    const updated = await prisma.$transaction(async (tx) => {
      if (roleChange && target.accountStatus === "ACTIVE") { await lockAdmins(tx); await assertCapacity(tx, role, target.id) }
      return tx.user.update({ where: { id: target.id }, data, select: SELECT })
    }, { maxWait: 10000, timeout: 20000 })

    audit(req.user.id, "UPDATE_ADMIN", target.id, roleChange ? `Role ${target.role} -> ${role}` : "Profile updated")
    res.json({ message: "Administrator updated", admin: present(updated, req.user) })
  } catch (e) { fail(res, e, "updateAdmin") }
}

// ---- POST /api/admin-users/:id/deactivate -------------------------------------------
exports.deactivateAdmin = async (req, res) => {
  try {
    const target = await loadAdmin(req.params.id)
    guard(req.user, target)
    if (target.accountStatus !== "ACTIVE") throw new PolicyError(400, "Administrator is already deactivated")
    const updated = await prisma.user.update({
      where: { id: target.id },
      data: { isActive: false, accountStatus: "INACTIVE", deactivatedAt: new Date(), tokenVersion: { increment: 1 }, otpCode: null, otpExpiry: null },
      select: SELECT,
    })
    audit(req.user.id, "DEACTIVATE_ADMIN", target.id, target.email)
    res.json({ message: "Administrator deactivated. Their sessions have been ended.", admin: present(updated, req.user) })
  } catch (e) { fail(res, e, "deactivateAdmin") }
}

// ---- POST /api/admin-users/:id/reactivate -------------------------------------------
exports.reactivateAdmin = async (req, res) => {
  try {
    const target = await loadAdmin(req.params.id)
    guard(req.user, target)
    if (target.accountStatus === "ACTIVE") throw new PolicyError(400, "Administrator is already active")
    const updated = await prisma.$transaction(async (tx) => {
      await lockAdmins(tx)
      await assertCapacity(tx, target.role)
      return tx.user.update({
        where: { id: target.id },
        data: { isActive: true, accountStatus: "ACTIVE", deactivatedAt: null, tokenVersion: { increment: 1 }, failedLoginAttempts: 0, lockedUntil: null },
        select: SELECT,
      })
    }, { maxWait: 10000, timeout: 20000 })
    audit(req.user.id, "REACTIVATE_ADMIN", target.id, target.email)
    res.json({ message: "Administrator reactivated", admin: present(updated, req.user) })
  } catch (e) { fail(res, e, "reactivateAdmin") }
}

// ---- POST /api/admin-users/:id/reset-credentials ------------------------------------
exports.resetCredentials = async (req, res) => {
  try {
    const target = await loadAdmin(req.params.id)
    guard(req.user, target)
    if (target.accountStatus !== "ACTIVE") throw new PolicyError(400, "Reactivate this administrator first")
    const tempPassword = policy.generateTempPassword()
    const inv = policy.newInviteToken()
    const updated = await prisma.user.update({
      where: { id: target.id },
      data: {
        password: await bcrypt.hash(tempPassword, 10), mustChangePassword: true, inviteTokenHash: inv.hash, inviteExpiry: inv.expiry,
        tokenVersion: { increment: 1 }, failedLoginAttempts: 0, lockedUntil: null, otpCode: null, otpExpiry: null, otpAttempts: 0,
      },
    })
    const delivery = await deliverCredentials(updated, tempPassword, inv)
    audit(req.user.id, "RESET_ADMIN_CREDENTIALS", target.id, target.email)
    res.json({ message: "New temporary credentials issued", ...delivery })
  } catch (e) { fail(res, e, "resetCredentials") }
}

// ---- DELETE /api/admin-users/:id (only if the admin never acted) --------------------
exports.deleteAdmin = async (req, res) => {
  try {
    const target = await loadAdmin(req.params.id)
    guard(req.user, target)
    try {
      await prisma.user.delete({ where: { id: target.id } })
    } catch (err) {
      if (err.code === "P2003" || err.code === "P2014")
        throw new PolicyError(409, "This administrator has activity history and cannot be deleted. Deactivate them instead.")
      throw err
    }
    audit(req.user.id, "DELETE_ADMIN", target.id, target.email)
    res.json({ message: "Administrator deleted" })
  } catch (e) { fail(res, e, "deleteAdmin") }
}
