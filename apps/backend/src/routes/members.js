const express = require("express");
const router = express.Router();
const membersController = require("../controllers/membersController");
const authenticateToken = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");

const ADMIN_ROLES = ["SUPER_ADMIN", "TREASURER", "SECRETARY"];

// --- CORE CRUD ROUTES ---

// GET all members — admins only
router.get(
  "/",
  authenticateToken,
  requireRole(ADMIN_ROLES),
  membersController.getMembers
);

// POST new member — super admin only
router.post(
  "/",
  authenticateToken,
  requireRole(["SUPER_ADMIN"]),
  membersController.createMember
);

// GET member by ID — admins or the member themselves
router.get(
  "/:id",
  authenticateToken,
  requireRole([...ADMIN_ROLES, "MEMBER"]),
  membersController.getMemberById
);

// PUT update member — admins or the member themselves
router.put(
  "/:id",
  authenticateToken,
  requireRole([...ADMIN_ROLES, "MEMBER"]),
  membersController.updateMember
);

// DELETE member — super admin only
router.delete(
  "/:id",
  authenticateToken,
  requireRole(["SUPER_ADMIN"]),
  membersController.deleteMember
);

// --- MEMBER MANAGEMENT ACTIONS (SUPER ADMIN ONLY) ---

router.post(
  "/:id/activate",
  authenticateToken,
  requireRole(["SUPER_ADMIN"]),
  membersController.activateMember
);

router.post(
  "/:id/deactivate",
  authenticateToken,
  requireRole(["SUPER_ADMIN"]),
  membersController.deactivateMember
);

router.post(
  "/:id/anonymise",
  authenticateToken,
  requireRole(["SUPER_ADMIN"]),
  membersController.anonymiseMember
);

router.post(
  "/:id/send-reset-link",
  authenticateToken,
  requireRole(["SUPER_ADMIN"]),
  membersController.sendResetLink
);

module.exports = router;