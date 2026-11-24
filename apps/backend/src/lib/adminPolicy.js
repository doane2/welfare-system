const crypto = require("crypto")

const ADMIN_ROLES = ["SUPER_ADMIN", "TREASURER", "SECRETARY"]
// SUPER_ADMIN limit includes the primary super admin (1 primary + 2 platform admins)
const ROLE_LIMITS = { SUPER_ADMIN: 3, TREASURER: 3, SECRETARY: 3 }
const ROLE_LABELS = { SUPER_ADMIN: "Platform Admin", TREASURER: "Treasurer", SECRETARY: "Secretary" }

// Set to true if platform admins should be allowed to manage other platform admins.
const PLATFORM_ADMINS_CAN_MANAGE_PLATFORM_ADMINS = false

const INVITE_EXPIRY_HOURS = 72
const MAX_FAILED_LOGINS = 5
const LOCK_MINUTES = 15
const MAX_OTP_ATTEMPTS = 5

const roleLabel = (u) => (u.isPrimary ? "Super Admin (Primary)" : ROLE_LABELS[u.role] || u.role)
const sha256 = (v) => crypto.createHash("sha256").update(String(v)).digest("hex")

function newInviteToken() {
  const token = crypto.randomBytes(32).toString("hex")
  return { token, hash: sha256(token), expiry: new Date(Date.now() + INVITE_EXPIRY_HOURS * 3600 * 1000) }
}

function generateTempPassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"
  const lower = "abcdefghijkmnpqrstuvwxyz"
  const digits = "23456789"
  const special = "@#$%&*!"
  const pick = (set) => set[crypto.randomInt(set.length)]
  const chars = [pick(upper), pick(upper), pick(lower), pick(lower), pick(digits), pick(digits), pick(special)]
  while (chars.length < 12) chars.push(pick(upper + lower + digits))
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join("")
}

function validateAdminPassword(pw) {
  if (typeof pw !== "string" || pw.length < 10) return "Password must be at least 10 characters"
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw) || !/\d/.test(pw))
    return "Password must include an uppercase letter, a lowercase letter and a number"
  return null
}

// Central rule: who may modify which admin account
function canManage(actor, target) {
  if (target.isPrimary) return { ok: false, reason: "The primary super admin cannot be modified by anyone." }
  if (actor.id === target.id) return { ok: false, reason: "You cannot change your own administrator account here." }
  if (actor.role !== "SUPER_ADMIN") return { ok: false, reason: "Only super admins can manage administrators." }
  if (target.role === "SUPER_ADMIN" && !actor.isPrimary && !PLATFORM_ADMINS_CAN_MANAGE_PLATFORM_ADMINS)
    return { ok: false, reason: "Only the primary super admin can manage platform admins." }
  return { ok: true }
}

const frontendUrl = () =>
  (process.env.FRONTEND_URL || process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "")

module.exports = {
  ADMIN_ROLES, ROLE_LIMITS, ROLE_LABELS, PLATFORM_ADMINS_CAN_MANAGE_PLATFORM_ADMINS,
  INVITE_EXPIRY_HOURS, MAX_FAILED_LOGINS, LOCK_MINUTES, MAX_OTP_ATTEMPTS,
  roleLabel, sha256, newInviteToken, generateTempPassword, validateAdminPassword, canManage, frontendUrl,
}
