const express     = require("express")
const router      = express.Router()
const ctrl        = require("../controllers/beneficiaryRequestsController")
const auth        = require("../middleware/authMiddleware")
const requireRole = require("../middleware/requireRole")

const ADMIN_ROLES = ["SUPER_ADMIN", "SECRETARY"]
const ALL_ROLES   = ["SUPER_ADMIN", "TREASURER", "SECRETARY", "MEMBER"]

// GET  all requests — members see own, admins see all (filter by ?memberId=)
router.get(  "/",           auth, requireRole(ALL_ROLES),   ctrl.getRequests)

// POST new request — members only
router.post( "/",           auth, requireRole(ALL_ROLES),   ctrl.createRequest)

// PATCH approve — admins only (auto-applies the change)
router.patch("/:id/approve",auth, requireRole(ADMIN_ROLES), ctrl.approveRequest)

// PATCH reject — admins only
router.patch("/:id/reject", auth, requireRole(ADMIN_ROLES), ctrl.rejectRequest)

module.exports = router
