const express = require("express")
const router = express.Router()
const paymentsController = require("../controllers/paymentsController")
const authenticateToken = require("../middleware/authMiddleware")
const requireRole = require("../middleware/requireRole")

const ADMIN_ROLES = ["SUPER_ADMIN", "TREASURER", "SECRETARY"]

// GET all payments — admins only
router.get(
  "/",
  authenticateToken,
  requireRole(ADMIN_ROLES),
  paymentsController.getPayments
)

// POST new payment — admins only
router.post(
  "/",
  authenticateToken,
  requireRole(ADMIN_ROLES),
  paymentsController.createPayment
)

// GET single payment
router.get(
  "/:id",
  authenticateToken,
  requireRole([...ADMIN_ROLES, "MEMBER"]),
  paymentsController.getPaymentById
)

// POST M-Pesa webhook — public (no auth, called by M-Pesa)
router.post("/webhook/mpesa", paymentsController.mpesaWebhook)

module.exports = router
