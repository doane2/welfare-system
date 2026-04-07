// services/cloudinaryService.js
/**
 * Cloudinary Service
 * ──────────────────
 * Handles all file uploads and deletions for:
 * - Claim documents (PDFs/images)
 * - Member profile photos (images)
 * - Loan documents (PDFs/images)
 * - Announcement attachments (PDFs/images)
 */

const cloudinary = require("cloudinary").v2
if (process.env.NODE_ENV !== 'production') { require("dotenv").config() }

// ─── Configure Cloudinary ─────────────────────────────────
cloudinary.config({
  cloud_name : process.env.CLOUDINARY_CLOUD_NAME,
  api_key    : process.env.CLOUDINARY_API_KEY,
  api_secret : process.env.CLOUDINARY_API_SECRET,
})

// Warn loudly at startup if credentials are missing
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.warn("⚠️  Cloudinary credentials are incomplete. Check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in your .env")
}

// ─── Allowed File Types ───────────────────────────────────
// NOTE: Keep this in sync with the frontend file filter in dashboard/claims/page.tsx
const ALLOWED_FORMATS  = ["jpg", "jpeg", "png", "webp", "pdf"]
const ALLOWED_MIMETYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]
const MAX_FILE_SIZE_MB = 10 // 10 MB max per file

// ─── Folder Structure in Cloudinary ──────────────────────
const FOLDERS = {
  CLAIM        : "welfare/claims",
  PROFILE      : "welfare/profiles",
  LOAN         : "welfare/loans",
  ANNOUNCEMENT : "welfare/announcements",
}

// ─── Upload File (from buffer) ────────────────────────────
const uploadFile = (fileBuffer, { folder, filename, mimetype }) => {
  return new Promise((resolve, reject) => {

    if (!ALLOWED_MIMETYPES.includes(mimetype)) {
      return reject(new Error(`File type not allowed. Allowed types: JPG, PNG, WEBP, PDF`))
    }

    // PDFs must use resource_type "raw"; images use "image"
    const resourceType = mimetype === "application/pdf" ? "raw" : "image"

    const uploadOptions = {
      folder,
      public_id      : filename,
      resource_type  : resourceType,
      allowed_formats: ALLOWED_FORMATS,
      overwrite      : false,
      // Auto-optimise images on Cloudinary side
      ...(resourceType === "image" && {
        transformation: [
          { quality: "auto" },
          { fetch_format: "auto" },
        ],
      }),
    }

    const stream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error("❌ Cloudinary upload_stream error:", error.message, error.http_code)
          return reject(new Error(error.message || "Cloudinary upload failed"))
        }
        resolve({
          url         : result.secure_url,
          publicId    : result.public_id,
          format      : result.format,
          size        : result.bytes,
          resourceType: result.resource_type,
          createdAt   : result.created_at,
        })
      }
    )

    stream.end(fileBuffer)
  })
}

// ─── Upload Claim Document ────────────────────────────────
const uploadClaimDocument = async (fileBuffer, { mimetype, originalName, claimId }) => {
  const timestamp = Date.now()
  const filename  = `claim_${claimId}_${timestamp}`

  return uploadFile(fileBuffer, {
    folder  : FOLDERS.CLAIM,
    filename,
    mimetype,
  })
}

// ─── Upload Profile Photo ─────────────────────────────────
const uploadProfilePhoto = async (fileBuffer, { mimetype, memberId }) => {
  if (mimetype === "application/pdf") {
    throw new Error("Profile photo must be an image (JPG, PNG, WEBP)")
  }
  const filename = `profile_${memberId}`
  return uploadFile(fileBuffer, {
    folder  : FOLDERS.PROFILE,
    filename,
    mimetype,
  })
}

// ─── Upload Loan Document ─────────────────────────────────
const uploadLoanDocument = async (fileBuffer, { mimetype, originalName, loanId }) => {
  const timestamp = Date.now()
  const filename  = `loan_${loanId}_${timestamp}`
  return uploadFile(fileBuffer, {
    folder  : FOLDERS.LOAN,
    filename,
    mimetype,
  })
}

// ─── Upload Announcement Attachment ──────────────────────
const uploadAnnouncementAttachment = async (fileBuffer, { mimetype, announcementId }) => {
  const timestamp = Date.now()
  const filename  = `announcement_${announcementId}_${timestamp}`
  return uploadFile(fileBuffer, {
    folder  : FOLDERS.ANNOUNCEMENT,
    filename,
    mimetype,
  })
}

// ─── Delete File ──────────────────────────────────────────
const deleteFile = async (publicId, mimetype) => {
  try {
    const resourceType = mimetype === "application/pdf" ? "raw" : "image"
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType })
    console.log(`✅ Cloudinary file deleted: ${publicId}`)
    return result
  } catch (error) {
    console.error(`❌ Cloudinary delete failed for ${publicId}:`, error.message)
    throw error
  }
}

// ─── Get File Info ────────────────────────────────────────
const getFileInfo = async (publicId, mimetype) => {
  try {
    const resourceType = mimetype === "application/pdf" ? "raw" : "image"
    return await cloudinary.api.resource(publicId, { resource_type: resourceType })
  } catch (error) {
    console.error(`❌ Cloudinary getFileInfo failed:`, error.message)
    throw error
  }
}

module.exports = {
  uploadClaimDocument,
  uploadProfilePhoto,
  uploadLoanDocument,
  uploadAnnouncementAttachment,
  deleteFile,
  getFileInfo,
  ALLOWED_MIMETYPES,
  MAX_FILE_SIZE_MB,
}
