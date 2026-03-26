const express    = require("express")
const router     = express.Router()
const controller = require("../controllers/auditLogsController")
const auth       = require("../middleware/authMiddleware")
const requireRole = require("../middleware/requireRole")

const ADMIN_ROLES = ["SUPER_ADMIN", "TREASURER", "SECRETARY"]

// GET all logs — admins only
router.get(
  "/",
  auth,
  requireRole(ADMIN_ROLES),
  controller.getAuditLogs
)

// GET action types — admins only
router.get(
  "/actions",
  auth,
  requireRole(ADMIN_ROLES),
  controller.getActionTypes
)

module.exports = router
