const express    = require("express")
const router     = express.Router()
const { getMemberDashboard, getMemberStatement } = require("../controllers/dashboardController")
const authenticateToken = require("../middleware/authMiddleware")
const requireRole       = require("../middleware/requireRole")

const ALL_ROLES = ["SUPER_ADMIN", "TREASURER", "SECRETARY", "MEMBER"]

router.get("/me",           authenticateToken, requireRole(ALL_ROLES), getMemberDashboard)
router.get("/me/statement", authenticateToken, requireRole(ALL_ROLES), getMemberStatement)

module.exports = router
