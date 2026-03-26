const express = require("express")
const router = express.Router()
const loanRepaymentsController = require("../controllers/loanRepaymentsController")
const authenticateToken = require("../middleware/authMiddleware")
const requireRole = require("../middleware/requireRole")

const ADMIN_ROLES = ["SUPER_ADMIN", "TREASURER", "SECRETARY"]

// GET all repayments — admins only
router.get(
  "/",
  authenticateToken,
  requireRole([...ADMIN_ROLES, "MEMBER"]),
  loanRepaymentsController.getRepayments
)

// GET repayments for a specific loan
router.get(
  "/loan/:loanId",
  authenticateToken,
  requireRole([...ADMIN_ROLES, "MEMBER"]),
  loanRepaymentsController.getRepaymentsByLoan
)

// GET single repayment
router.get(
  "/:id",
  authenticateToken,
  requireRole([...ADMIN_ROLES, "MEMBER"]),
  loanRepaymentsController.getRepaymentById
)

// DELETE repayment — super admin only (for corrections)
router.delete(
  "/:id",
  authenticateToken,
  requireRole(["SUPER_ADMIN"]),
  loanRepaymentsController.deleteRepayment
)

module.exports = router
