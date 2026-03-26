const express = require("express")
const router = express.Router()
const notificationsController = require("../controllers/notificationsController")
const authenticateToken = require("../middleware/authMiddleware")
const requireRole = require("../middleware/requireRole")

const ADMIN_ROLES = ["SUPER_ADMIN", "TREASURER", "SECRETARY"]

// GET my notifications — logged-in user
router.get(
  "/my",
  authenticateToken,
  notificationsController.getMyNotifications
)

router.get(
  "/",
  authenticateToken,
  requireRole([...ADMIN_ROLES, "MEMBER"]),
  notificationsController.getNotifications
)

router.post(
  "/",
  authenticateToken,
  notificationsController.createNotification
)

// PATCH mark single as read
router.patch(
  "/:id/read",
  authenticateToken,
  notificationsController.markAsRead
)

// PATCH mark all as read
router.patch(
  "/read-all",
  authenticateToken,
  notificationsController.markAllAsRead
)

// DELETE notification
router.delete(
  "/:id",
  authenticateToken,
  notificationsController.deleteNotification
)

module.exports = router
