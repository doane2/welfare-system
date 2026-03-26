const express = require("express")
const router = express.Router()
const announcementsController = require("../controllers/announcementsController")
const authenticateToken = require("../middleware/authMiddleware")
const requireRole = require("../middleware/requireRole")

const ADMIN_ROLES = ["SUPER_ADMIN", "TREASURER", "SECRETARY"]

// GET active announcements — all authenticated users (members dashboard)
router.get(
  "/active",
  authenticateToken,
  announcementsController.getActiveAnnouncements
)

// GET all announcements — admins only
router.get(
  "/",
  authenticateToken,
  requireRole(ADMIN_ROLES),
  announcementsController.getAnnouncements
)

// POST create announcement — admins only
router.post(
  "/",
  authenticateToken,
  requireRole(ADMIN_ROLES),
  announcementsController.createAnnouncement
)

// GET single announcement
router.get(
  "/:id",
  authenticateToken,
  announcementsController.getAnnouncementById
)

// PUT update announcement — admins only
router.put(
  "/:id",
  authenticateToken,
  requireRole(ADMIN_ROLES),
  announcementsController.updateAnnouncement
)

// PATCH toggle active status — admins only
router.patch(
  "/:id/toggle",
  authenticateToken,
  requireRole(ADMIN_ROLES),
  announcementsController.toggleAnnouncement
)

// DELETE announcement — super admin only
router.delete(
  "/:id",
  authenticateToken,
  requireRole(["SUPER_ADMIN"]),
  announcementsController.deleteAnnouncement
)

module.exports = router
