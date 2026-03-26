const express    = require("express")
const router     = express.Router()
const mpesa      = require("../controllers/mpesaController")
const auth       = require("../middleware/authMiddleware")
const requireRole = require("../middleware/requireRole")

const ADMIN_ROLES  = ["SUPER_ADMIN", "TREASURER"]
const ALL_ROLES    = ["SUPER_ADMIN", "TREASURER", "SECRETARY", "MEMBER"]

// ── STK Push (member initiates from dashboard) ────────────
router.post("/stk-push",        auth, requireRole(ALL_ROLES),  mpesa.stkPush)

// ── Safaricom callbacks (no auth — public endpoints) ──────
router.post("/stk-callback",    mpesa.stkCallback)
router.post("/c2b-validation",  mpesa.c2bValidation)
router.post("/c2b-confirmation",mpesa.c2bConfirmation)

// ── C2B registration (admin runs once) ───────────────────
router.post("/register-c2b",    auth, requireRole(ADMIN_ROLES), mpesa.registerC2BUrls)

// ── Manual payment recording (admin records offline cash/bank) ──
router.post("/manual",          auth, requireRole(ADMIN_ROLES), mpesa.recordManualPayment)

// ── Pending approval queue ────────────────────────────────
router.get("/pending",          auth, requireRole(ADMIN_ROLES), mpesa.getPendingPayments)

// ── Approve / Reject ──────────────────────────────────────
router.patch("/:id/approve",    auth, requireRole(ADMIN_ROLES), mpesa.approvePayment)
router.patch("/:id/reject",     auth, requireRole(ADMIN_ROLES), mpesa.rejectPayment)

module.exports = router
