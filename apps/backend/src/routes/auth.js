const express = require("express")
const router = express.Router()
const auth = require("../controllers/authController")
const authMiddleware = require("../middleware/authMiddleware")

// Member sign-in (admins are rejected here and pointed to the admin portal)
router.post("/login", auth.login)
// Admin sign-in: step 1 (password) -> OTP, step 2 via /verify-otp
router.post("/admin/login", auth.adminLogin)
router.post("/verify-otp", auth.verifyOtp)
router.post("/resend-otp", auth.resendOtp)
router.post("/activate", auth.activateAccount)

// Admin invitations (public, token-based)
router.get("/admin/invite/:token", auth.getAdminInvite)
router.post("/admin/accept-invite", auth.acceptAdminInvite)

router.get("/profile", authMiddleware, auth.getProfile)
router.put("/change-password", authMiddleware, auth.changePassword)

module.exports = router
