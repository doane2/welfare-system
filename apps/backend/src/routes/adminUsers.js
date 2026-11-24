const express = require("express")
const router = express.Router()
const c = require("../controllers/adminUsersController")
const authenticateToken = require("../middleware/authMiddleware")
const requireRole = require("../middleware/requireRole")

// Super admins only. Finer rules (primary protection, platform-admin rules) live in lib/adminPolicy.js
router.use(authenticateToken, requireRole(["SUPER_ADMIN"]))

router.get("/", c.listAdmins)
router.post("/", c.createAdmin)
router.patch("/:id", c.updateAdmin)
router.post("/:id/deactivate", c.deactivateAdmin)
router.post("/:id/reactivate", c.reactivateAdmin)
router.post("/:id/reset-credentials", c.resetCredentials)
router.delete("/:id", c.deleteAdmin)

module.exports = router
