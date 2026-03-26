const express = require("express")
const router = express.Router()
const loansController = require("../controllers/loansController")
const authenticateToken = require("../middleware/authMiddleware")
const requireRole = require("../middleware/requireRole")

const ADMIN_ROLES = ["SUPER_ADMIN", "TREASURER", "SECRETARY"]

// GET all loans — admins only
router.get(
  "/",
  authenticateToken,
  requireRole([...ADMIN_ROLES, "MEMBER"]),
  loansController.getLoans
)

router.get("/limit/:memberId",         authenticateToken, requireRole(["SUPER_ADMIN","TREASURER"]), loansController.getMemberLoanLimit)
router.patch("/eligibility/:memberId", authenticateToken, requireRole(["SUPER_ADMIN","TREASURER"]), loansController.setLoanEligibility)

// POST new loan application — admins only
router.post(
  "/",
  authenticateToken,
  requireRole(ADMIN_ROLES),
  loansController.createLoan
)

// GET single loan
router.get(
  "/:id",
  authenticateToken,
  requireRole([...ADMIN_ROLES, "MEMBER"]),
  loansController.getLoanById
)

// PATCH approve loan — admins only
router.patch(
  "/:id/approve",
  authenticateToken,
  requireRole(ADMIN_ROLES),
  loansController.approveLoan
)

// PATCH reject loan — admins only
router.patch(
  "/:id/reject",
  authenticateToken,
  requireRole(ADMIN_ROLES),
  loansController.rejectLoan
)

// POST add repayment — admins only
router.post(
  "/:id/repayments",
  authenticateToken,
  requireRole(ADMIN_ROLES),
  loansController.addRepayment
)

module.exports = router
