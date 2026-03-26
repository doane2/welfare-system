const express = require("express")
const router = express.Router()
const claimsController = require("../controllers/claimsController")
const authenticateToken = require("../middleware/authMiddleware")
const requireRole = require("../middleware/requireRole")

const ADMIN_ROLES = ["SUPER_ADMIN", "TREASURER", "SECRETARY"]

// GET all claims — admins only
router.get(
  "/",
  authenticateToken,
  requireRole([...ADMIN_ROLES, "MEMBER"]),
  claimsController.getClaims
)

// POST new claim — members & admins
router.post(
  "/",
  authenticateToken,
  requireRole([...ADMIN_ROLES, "MEMBER"]),
  claimsController.createClaim
)

// GET single claim
router.get(
  "/:id",
  authenticateToken,
  requireRole([...ADMIN_ROLES, "MEMBER"]),
  claimsController.getClaimById
)

// PATCH approve claim — admins only
router.patch(
  "/:id/approve",
  authenticateToken,
  requireRole(ADMIN_ROLES),
  claimsController.approveClaim
)

// PATCH reject claim — admins only
router.patch(
  "/:id/reject",
  authenticateToken,
  requireRole(ADMIN_ROLES),
  claimsController.rejectClaim
)

// POST add document to claim
router.post(
  "/:id/documents",
  authenticateToken,
  requireRole([...ADMIN_ROLES, "MEMBER"]),
  claimsController.addClaimDocument
)

module.exports = router
