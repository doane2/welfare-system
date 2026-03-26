const express     = require("express")
const router      = express.Router()
const dep         = require("../controllers/dependentsController")
const auth        = require("../middleware/authMiddleware")
const requireRole = require("../middleware/requireRole")

const ADMIN_ROLES = ["SUPER_ADMIN", "SECRETARY"]
const ALL_ROLES   = ["SUPER_ADMIN", "TREASURER", "SECRETARY", "MEMBER"]

// Get all dependents for a member
router.get("/member/:memberId",  auth, requireRole(ALL_ROLES),   dep.getDependents)

// Add dependent to member — admin only
router.post("/member/:memberId", auth, requireRole(ADMIN_ROLES), dep.addDependent)

// Update dependent
router.put("/:id",               auth, requireRole(ADMIN_ROLES), dep.updateDependent)

// Remove dependent
router.delete("/:id",            auth, requireRole(ADMIN_ROLES), dep.removeDependent)

module.exports = router
