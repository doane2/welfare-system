const express         = require("express")
const router          = express.Router()
const reportsController = require("../controllers/reportsController")
const authenticateToken = require("../middleware/authMiddleware")
const requireRole     = require("../middleware/requireRole")

const ALL_ADMINS     = ["SUPER_ADMIN", "TREASURER", "SECRETARY"]
const FINANCE_ADMINS = ["SUPER_ADMIN", "TREASURER"]
const MANAGE_ADMINS  = ["SUPER_ADMIN", "SECRETARY"]

// ── Annual financial report — all admins ──────────────────────────────────────
router.get(
  "/annual",
  authenticateToken,
  requireRole(ALL_ADMINS),
  reportsController.getAnnualReport
)

// ── Member directory report — super admin + secretary ─────────────────────────
router.get(
  "/members",
  authenticateToken,
  requireRole(MANAGE_ADMINS),
  reportsController.getMembersReport
)

// ── Financial receipts report — super admin + treasurer ───────────────────────
router.get(
  "/financial",
  authenticateToken,
  requireRole(FINANCE_ADMINS),
  reportsController.getFinancialReport
)

// ── Flag member/dependent as deceased — super admin + secretary ───────────────
router.post(
  "/deceased",
  authenticateToken,
  requireRole(MANAGE_ADMINS),
  reportsController.flagDeceased
)

// ── Remove deceased flag (data correction) — super admin only ─────────────────
router.post(
  "/unflag-deceased",
  authenticateToken,
  requireRole(["SUPER_ADMIN"]),
  reportsController.unflagDeceased
)

module.exports = router
