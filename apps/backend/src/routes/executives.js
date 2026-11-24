const express = require("express")
const router = express.Router()
const c = require("../controllers/executivesController")
const authenticateToken = require("../middleware/authMiddleware")
const requireRole = require("../middleware/requireRole")

// Everyone signed in can read (members see them on their dashboard); only super admins can change
router.get("/", authenticateToken, c.listExecutives)
router.post("/", authenticateToken, requireRole(["SUPER_ADMIN"]), c.createExecutive)
router.put("/:id", authenticateToken, requireRole(["SUPER_ADMIN"]), c.updateExecutive)
router.delete("/:id", authenticateToken, requireRole(["SUPER_ADMIN"]), c.deleteExecutive)

module.exports = router
