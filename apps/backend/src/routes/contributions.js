const express = require("express")
const router  = express.Router()
const contributionsController = require("../controllers/contributionsController")
const authenticateToken       = require("../middleware/authMiddleware")
const requireRole             = require("../middleware/requireRole")

const ADMIN_ROLES = ["SUPER_ADMIN", "TREASURER", "SECRETARY"]
const ALL_ROLES   = ["SUPER_ADMIN", "TREASURER", "SECRETARY", "MEMBER"]

// GET all contributions
// Members get their own only (scoped in controller via req.user.role === "MEMBER")
// Admins get all (or filtered by ?userId=)
router.get(
  "/",
  authenticateToken,
  requireRole(ALL_ROLES),   // ← FIX: was ADMIN_ROLES, excluded MEMBER
  contributionsController.getContributions
)

// POST new contribution — admins only
router.post(
  "/",
  authenticateToken,
  requireRole(ADMIN_ROLES),
  contributionsController.createContribution
)

// GET single contribution — members can view their own (controller enforces ownership)
router.get(
  "/:id",
  authenticateToken,
  requireRole(ALL_ROLES),
  contributionsController.getContributionById
)

// PATCH edit contribution — admins only
router.patch(
  "/:id/edit",
  authenticateToken,
  requireRole(["SUPER_ADMIN", "TREASURER"]),
  contributionsController.editContribution
)

// PATCH approve contribution — admins only
router.patch(
  "/:id/approve",
  authenticateToken,
  requireRole(ADMIN_ROLES),
  contributionsController.approveContribution
)

// PATCH reject contribution — admins only
router.patch(
  "/:id/reject",
  authenticateToken,
  requireRole(ADMIN_ROLES),
  contributionsController.rejectContribution
)

// DELETE contribution — super admin only
router.delete(
  "/:id",
  authenticateToken,
  requireRole(["SUPER_ADMIN"]),
  contributionsController.deleteContribution
)

module.exports = router