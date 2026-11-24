const express = require("express")
const router = express.Router()
const contact = require("../controllers/contactController")
const authenticateToken = require("../middleware/authMiddleware")
const requireRole = require("../middleware/requireRole")

// Only super admins read and manage website enquiries.
// To let secretaries in too, add "SECRETARY" to this list.
const CONTACT_ROLES = ["SUPER_ADMIN"]

// Small in-memory limiter for the public form: 5 messages per IP every 15 minutes
const hits = new Map()
const limiter = (max, windowMs) => (req, res, next) => {
  const ip  = (req.headers["x-forwarded-for"] || "").toString().split(",")[0].trim() || req.socket?.remoteAddress || "unknown"
  const now = Date.now()
  const recent = (hits.get(ip) || []).filter((t) => now - t < windowMs)
  if (recent.length >= max) return res.status(429).json({ message: "Too many messages from this device. Please try again later." })
  recent.push(now)
  hits.set(ip, recent)
  next()
}
setInterval(() => {
  const now = Date.now()
  for (const [ip, list] of hits) if (!list.some((t) => now - t < 15 * 60 * 1000)) hits.delete(ip)
}, 10 * 60 * 1000).unref()

// Public
router.post("/", limiter(5, 15 * 60 * 1000), contact.submitContact)

// Super admin
router.get("/", authenticateToken, requireRole(CONTACT_ROLES), contact.listContacts)
router.patch("/:id", authenticateToken, requireRole(CONTACT_ROLES), contact.updateContact)
router.delete("/:id", authenticateToken, requireRole(CONTACT_ROLES), contact.deleteContact)

module.exports = router