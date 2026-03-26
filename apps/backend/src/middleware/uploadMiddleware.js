/**
 * Upload Middleware — Multer
 * ──────────────────────────
 * Parses incoming multipart/form-data file uploads.
 * Files are stored in memory (buffer) before being
 * sent to Cloudinary — no temp files on disk.
 */

const multer = require("multer")
const { ALLOWED_MIMETYPES, MAX_FILE_SIZE_MB } = require("../services/cloudinaryService")

// ─── Memory Storage (no disk writes) ─────────────────────
const storage = multer.memoryStorage()

// ─── File Filter ──────────────────────────────────────────
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error(`File type not allowed. Allowed: JPG, PNG, WEBP, PDF`), false)
  }
}

// ─── Multer Instance ──────────────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024  // convert MB to bytes
  }
})

// ─── Middleware Variants ──────────────────────────────────

// Single file upload — field name: "file"
const uploadSingle = upload.single("file")

// Multiple files upload — field name: "files", max 5
const uploadMultiple = upload.array("files", 5)

// ─── Error Handler Wrapper ────────────────────────────────
// Wraps multer errors into clean JSON responses
const handleUpload = (uploadFn) => (req, res, next) => {
  uploadFn(req, res, (err) => {
    if (!err) return next()

    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          message: `File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB`
        })
      }
      if (err.code === "LIMIT_FILE_COUNT") {
        return res.status(400).json({
          message: "Too many files. Maximum is 5 files per upload"
        })
      }
      return res.status(400).json({ message: err.message })
    }

    // Custom file filter errors
    if (err) {
      return res.status(400).json({ message: err.message })
    }
  })
}

module.exports = {
  uploadSingle  : handleUpload(uploadSingle),
  uploadMultiple: handleUpload(uploadMultiple)
}
