const express    = require("express")
const router     = express.Router()
const auth       = require("../controllers/authController")
const authMiddleware = require("../middleware/authMiddleware")

// POST /api/auth/login         — step 1: verify password, send OTP (admins) or login directly (members)
router.post("/login",           auth.login)

// POST /api/auth/verify-otp    — step 2 (admins only): verify OTP, receive full JWT
router.post("/verify-otp",      auth.verifyOtp)

// POST /api/auth/resend-otp    — resend OTP (rate limited to once per minute)
router.post("/resend-otp",      auth.resendOtp)

// POST /api/auth/activate      — activate account & set password
router.post("/activate",        auth.activateAccount)

// GET  /api/auth/profile       — get logged-in user profile
router.get("/profile",          authMiddleware, auth.getProfile)

// PUT  /api/auth/change-password
router.put("/change-password",  authMiddleware, auth.changePassword)

module.exports = router
