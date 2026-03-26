const express    = require("express")
const router     = express.Router()
const uploadsController = require("../controllers/uploadsController")
const authenticateToken = require("../middleware/authMiddleware")
const requireRole       = require("../middleware/requireRole")
const { uploadSingle, uploadMultiple } = require("../middleware/uploadMiddleware")

const ADMIN_ROLES = ["SUPER_ADMIN", "TREASURER", "SECRETARY"]

// ─── Claim Documents ──────────────────────────────────────

// POST single claim document
router.post(
  "/claims/:claimId/document",
  authenticateToken,
  requireRole([...ADMIN_ROLES, "MEMBER"]),
  uploadSingle,
  uploadsController.uploadClaimDocument
)

// POST multiple claim documents (up to 5)
router.post(
  "/claims/:claimId/documents",
  authenticateToken,
  requireRole([...ADMIN_ROLES, "MEMBER"]),
  uploadMultiple,
  uploadsController.uploadClaimDocuments
)

// DELETE claim document
router.delete(
  "/claims/documents/:documentId",
  authenticateToken,
  requireRole([...ADMIN_ROLES, "MEMBER"]),
  uploadsController.deleteClaimDocument
)

// ─── Profile Photos ───────────────────────────────────────

// POST profile photo
router.post(
  "/members/:memberId/photo",
  authenticateToken,
  requireRole([...ADMIN_ROLES, "MEMBER"]),
  uploadSingle,
  uploadsController.uploadProfilePhoto
)

// ─── Loan Documents ───────────────────────────────────────

// POST loan document
router.post(
  "/loans/:loanId/document",
  authenticateToken,
  requireRole(ADMIN_ROLES),
  uploadSingle,
  uploadsController.uploadLoanDocument
)

// ─── Announcement Attachments ─────────────────────────────

// POST announcement attachment
router.post(
  "/announcements/:announcementId/attachment",
  authenticateToken,
  requireRole(ADMIN_ROLES),
  uploadSingle,
  uploadsController.uploadAnnouncementAttachment
)

module.exports = router
