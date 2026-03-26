const prisma = require("../lib/prisma")
const {
  uploadClaimDocument,
  uploadProfilePhoto,
  uploadLoanDocument,
  uploadAnnouncementAttachment,
  deleteFile
} = require("../services/cloudinaryService")

// ─── UPLOAD CLAIM DOCUMENT ────────────────────────────────
exports.uploadClaimDocument = async (req, res) => {
  try {
    const { claimId } = req.params

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" })
    }

    // Verify claim exists and belongs to this user (or admin)
    const claim = await prisma.claim.findUnique({ where: { id: claimId } })
    if (!claim) {
      return res.status(404).json({ message: "Claim not found" })
    }

    if (
      req.user.role === "MEMBER" &&
      claim.userId !== req.user.id
    ) {
      return res.status(403).json({ message: "Access denied" })
    }

    // Upload to Cloudinary
    const result = await uploadClaimDocument(req.file.buffer, {
      mimetype    : req.file.mimetype,
      originalName: req.file.originalname,
      claimId
    })

    // Save document record to database
    const document = await prisma.claimDocument.create({
      data: {
        claimId,
        url     : result.url,
        filename: req.file.originalname,
        mimeType: req.file.mimetype
      }
    })

    console.log(`✅ Claim document uploaded: ${result.url}`)

    res.status(201).json({
      message : "Document uploaded successfully",
      document: {
        id      : document.id,
        url     : document.url,
        filename: document.filename,
        mimeType: document.mimeType,
        size    : result.size,
        claimId
      }
    })

  } catch (error) {
    console.error("❌ uploadClaimDocument error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ─── UPLOAD MULTIPLE CLAIM DOCUMENTS ─────────────────────
exports.uploadClaimDocuments = async (req, res) => {
  try {
    const { claimId } = req.params

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" })
    }

    const claim = await prisma.claim.findUnique({ where: { id: claimId } })
    if (!claim) {
      return res.status(404).json({ message: "Claim not found" })
    }

    if (req.user.role === "MEMBER" && claim.userId !== req.user.id) {
      return res.status(403).json({ message: "Access denied" })
    }

    // Upload all files in parallel
    const uploadResults = await Promise.allSettled(
      req.files.map((file) =>
        uploadClaimDocument(file.buffer, {
          mimetype    : file.mimetype,
          originalName: file.originalname,
          claimId
        })
      )
    )

    const uploaded = []
    const failed   = []

    await Promise.all(
      uploadResults.map(async (result, index) => {
        if (result.status === "fulfilled") {
          const doc = await prisma.claimDocument.create({
            data: {
              claimId,
              url     : result.value.url,
              filename: req.files[index].originalname,
              mimeType: req.files[index].mimetype
            }
          })
          uploaded.push({
            id      : doc.id,
            url     : doc.url,
            filename: doc.filename,
            mimeType: doc.mimeType,
            size    : result.value.size
          })
        } else {
          failed.push({
            filename: req.files[index].originalname,
            error   : result.reason?.message
          })
        }
      })
    )

    console.log(`✅ Claim documents: ${uploaded.length} uploaded, ${failed.length} failed`)

    res.status(201).json({
      message : `${uploaded.length} document(s) uploaded successfully`,
      uploaded,
      failed  : failed.length > 0 ? failed : undefined
    })

  } catch (error) {
    console.error("❌ uploadClaimDocuments error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ─── UPLOAD PROFILE PHOTO ─────────────────────────────────
exports.uploadProfilePhoto = async (req, res) => {
  try {
    const { memberId } = req.params

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" })
    }

    // Only allow self or admin to upload profile photo
    if (
      req.user.role === "MEMBER" &&
      req.user.id !== memberId
    ) {
      return res.status(403).json({ message: "Access denied" })
    }

    const member = await prisma.user.findUnique({ where: { id: memberId } })
    if (!member) {
      return res.status(404).json({ message: "Member not found" })
    }

    // Upload to Cloudinary
    const result = await uploadProfilePhoto(req.file.buffer, {
      mimetype: req.file.mimetype,
      memberId
    })

    // Save photo URL to member record
    const updated = await prisma.user.update({
      where: { id: memberId },
      data : { profilePhoto: result.url }
    })

    console.log(`✅ Profile photo uploaded for member: ${memberId}`)

    res.json({
      message     : "Profile photo uploaded successfully",
      profilePhoto: result.url,
      memberId
    })

  } catch (error) {
    console.error("❌ uploadProfilePhoto error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ─── UPLOAD LOAN DOCUMENT ─────────────────────────────────
exports.uploadLoanDocument = async (req, res) => {
  try {
    const { loanId } = req.params

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" })
    }

    const loan = await prisma.loan.findUnique({ where: { id: loanId } })
    if (!loan) {
      return res.status(404).json({ message: "Loan not found" })
    }

    if (req.user.role === "MEMBER" && loan.userId !== req.user.id) {
      return res.status(403).json({ message: "Access denied" })
    }

    // Upload to Cloudinary
    const result = await uploadLoanDocument(req.file.buffer, {
      mimetype    : req.file.mimetype,
      originalName: req.file.originalname,
      loanId
    })

    // Save document URL to loan record
    const updated = await prisma.loan.update({
      where: { id: loanId },
      data : { documentUrl: result.url }
    })

    console.log(`✅ Loan document uploaded for loan: ${loanId}`)

    res.json({
      message    : "Loan document uploaded successfully",
      documentUrl: result.url,
      filename   : req.file.originalname,
      size       : result.size,
      loanId
    })

  } catch (error) {
    console.error("❌ uploadLoanDocument error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ─── UPLOAD ANNOUNCEMENT ATTACHMENT ──────────────────────
exports.uploadAnnouncementAttachment = async (req, res) => {
  try {
    const { announcementId } = req.params

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" })
    }

    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId }
    })
    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" })
    }

    // Upload to Cloudinary
    const result = await uploadAnnouncementAttachment(req.file.buffer, {
      mimetype      : req.file.mimetype,
      announcementId
    })

    // Save attachment URL to announcement record
    await prisma.announcement.update({
      where: { id: announcementId },
      data : { attachmentUrl: result.url }
    })

    console.log(`✅ Announcement attachment uploaded: ${announcementId}`)

    res.json({
      message      : "Attachment uploaded successfully",
      attachmentUrl: result.url,
      filename     : req.file.originalname,
      size         : result.size,
      announcementId
    })

  } catch (error) {
    console.error("❌ uploadAnnouncementAttachment error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ─── DELETE CLAIM DOCUMENT ────────────────────────────────
exports.deleteClaimDocument = async (req, res) => {
  try {
    const { documentId } = req.params

    const document = await prisma.claimDocument.findUnique({
      where  : { id: documentId },
      include: { claim: true }
    })

    if (!document) {
      return res.status(404).json({ message: "Document not found" })
    }

    if (
      req.user.role === "MEMBER" &&
      document.claim.userId !== req.user.id
    ) {
      return res.status(403).json({ message: "Access denied" })
    }

    // Extract publicId from Cloudinary URL
    const publicId = extractPublicId(document.url)

    // Delete from Cloudinary
    await deleteFile(publicId, document.mimeType)

    // Delete from database
    await prisma.claimDocument.delete({ where: { id: documentId } })

    console.log(`✅ Claim document deleted: ${documentId}`)

    res.json({ message: "Document deleted successfully" })

  } catch (error) {
    console.error("❌ deleteClaimDocument error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ─── HELPER — Extract Cloudinary Public ID from URL ───────
const extractPublicId = (url) => {
  // e.g. https://res.cloudinary.com/days6cqlc/image/upload/v123/welfare/claims/claim_abc_123.jpg
  // extracts: welfare/claims/claim_abc_123
  try {
    const parts    = url.split("/upload/")
    const withExt  = parts[1].replace(/^v\d+\//, "") // remove version
    const noExt    = withExt.replace(/\.[^/.]+$/, "") // remove extension
    return noExt
  } catch {
    return url
  }
}
