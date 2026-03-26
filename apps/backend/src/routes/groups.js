const express        = require("express")
const router         = express.Router()
const groupsController = require("../controllers/groupsController")
const authenticateToken = require("../middleware/authMiddleware")
const requireRole    = require("../middleware/requireRole")

const ALL_ADMINS   = ["SUPER_ADMIN", "TREASURER", "SECRETARY"]
const MANAGE_GROUP = ["SUPER_ADMIN", "SECRETARY"]   // create, update, delete groups
const MANAGE_MEMBERS = ["SUPER_ADMIN", "SECRETARY"] // add/remove members from groups

// ── GET all groups — all admins ────────────────────────────────────────────────
router.get(
  "/",
  authenticateToken,
  requireRole(ALL_ADMINS),
  groupsController.getGroups
)

// ── POST create group — super admin + secretary ────────────────────────────────
router.post(
  "/",
  authenticateToken,
  requireRole(MANAGE_GROUP),
  groupsController.createGroup
)

// ── GET single group with members — all admins ─────────────────────────────────
router.get(
  "/:id",
  authenticateToken,
  requireRole(ALL_ADMINS),
  groupsController.getGroupById
)

// ── PUT update group — super admin + secretary ─────────────────────────────────
router.put(
  "/:id",
  authenticateToken,
  requireRole(MANAGE_GROUP),
  groupsController.updateGroup
)

// ── POST add member to group — super admin + secretary ─────────────────────────
// Body: { memberNumber: "MBR-2026-XXXXX" } OR { memberId: "<uuid>" } (legacy)
router.post(
  "/:id/members",
  authenticateToken,
  requireRole(MANAGE_MEMBERS),
  groupsController.addMemberToGroup
)

// ── DELETE remove member from group — super admin + secretary ──────────────────
router.delete(
  "/:id/members/:memberId",
  authenticateToken,
  requireRole(MANAGE_MEMBERS),
  groupsController.removeMemberFromGroup
)

// ── DELETE group — super admin only ───────────────────────────────────────────
router.delete(
  "/:id",
  authenticateToken,
  requireRole(["SUPER_ADMIN"]),
  groupsController.deleteGroup
)

module.exports = router
