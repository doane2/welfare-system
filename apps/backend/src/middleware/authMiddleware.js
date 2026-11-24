const jwt = require("jsonwebtoken")
const prisma = require("../lib/prisma")

const ADMIN_ROLES = ["SUPER_ADMIN", "TREASURER", "SECRETARY"]
// Endpoints an admin may call while a password change is still required
const PASSWORD_CHANGE_ALLOWED = ["/api/auth/profile", "/api/auth/change-password"]

async function authenticateToken(req, res, next) {
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is not defined in environment variables")
    return res.status(500).json({ message: "Server configuration error" })
  }

  const authHeader = req.headers["authorization"]
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authorization header must be in format: Bearer <token>" })
  }
  const token = authHeader.split(" ")[1]
  if (!token) return res.status(401).json({ message: "Token required" })

  let payload
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET)
  } catch (err) {
    if (err.name === "TokenExpiredError")
      return res.status(401).json({ message: "Token has expired. Please log in again.", expired: true })
    if (err.name === "JsonWebTokenError") return res.status(403).json({ message: "Invalid token. Please log in again." })
    if (err.name === "NotBeforeError") return res.status(403).json({ message: "Token not yet valid." })
    return res.status(403).json({ message: "Token verification failed" })
  }

  if (!payload || !payload.id || !payload.role) return res.status(403).json({ message: "Invalid token payload" })

  // Live check: deactivation, role changes and password resets take effect immediately
  let dbUser
  try {
    dbUser = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, email: true, role: true, isActive: true, accountStatus: true, tokenVersion: true, isPrimary: true, mustChangePassword: true },
    })
  } catch (err) {
    console.error("Auth lookup failed:", err.message)
    return res.status(503).json({ message: "Service temporarily unavailable. Please try again." })
  }

  if (!dbUser) return res.status(401).json({ message: "Account no longer exists.", expired: true })
  if (!dbUser.isActive || dbUser.accountStatus !== "ACTIVE")
    return res.status(401).json({ message: "This account has been deactivated.", deactivated: true })
  if ((payload.tv || 0) !== (dbUser.tokenVersion || 0))
    return res.status(401).json({ message: "Your session has ended. Please log in again.", expired: true })

  req.user = {
    id: dbUser.id,
    email: dbUser.email,
    role: dbUser.role,
    type: ADMIN_ROLES.includes(dbUser.role) ? "admin" : "member",
    isPrimary: dbUser.isPrimary,
    mustChangePassword: dbUser.mustChangePassword,
  }

  if (dbUser.mustChangePassword) {
    const path = req.originalUrl.split("?")[0].replace(/\/+$/, "")
    if (!PASSWORD_CHANGE_ALLOWED.includes(path)) {
      return res.status(403).json({ message: "You must change your temporary password before continuing.", code: "PASSWORD_CHANGE_REQUIRED" })
    }
  }
  next()
}

module.exports = authenticateToken
