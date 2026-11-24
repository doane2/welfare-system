const prisma = require("../lib/prisma")
const { sendContactNotificationEmail, sendContactReceiptEmail } = require("../services/emailService")

const TYPES    = ["MEMBERSHIP", "CONTRIBUTIONS", "CLAIMS", "LOANS", "SUPPORT", "OTHER"]
const STATUSES = ["NEW", "IN_PROGRESS", "RESOLVED"]
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RX = /^\+?\d{9,15}$/

const clean = (v) => (typeof v === "string" ? v.trim() : "")
const clientIp = (req) =>
  (req.headers["x-forwarded-for"] || "").toString().split(",")[0].trim() || req.socket?.remoteAddress || null

// Tell every active super admin (and any CONTACT_NOTIFY_EMAIL addresses) about a new enquiry
async function notify(contact) {
  const extra  = (process.env.CONTACT_NOTIFY_EMAIL || "").split(",").map((s) => s.trim()).filter(Boolean)
  const admins = await prisma.user.findMany({
    where: { role: "SUPER_ADMIN", isActive: true, accountStatus: "ACTIVE" },
    select: { email: true },
  })
  const to = [...new Set([...extra, ...admins.map((a) => a.email)])]
  const jobs = to.map((email) => sendContactNotificationEmail({ email, contact }))
  if (contact.email) jobs.push(sendContactReceiptEmail({ email: contact.email, fullName: contact.fullName }))
  await Promise.allSettled(jobs)
}

// ---- POST /api/contact (public) ------------------------------------------------------
exports.submitContact = async (req, res) => {
  try {
    const b = req.body || {}
    // Honeypot: real visitors never fill this hidden field. Pretend success so bots learn nothing.
    if (clean(b.website)) return res.status(201).json({ message: "Thank you. Your message has been received." })

    const fullName    = clean(b.fullName).slice(0, 100)
    const phone       = clean(b.phone).replace(/[\s()-]/g, "")
    const email       = clean(b.email).toLowerCase().slice(0, 150)
    const message     = clean(b.message)
    const inquiryType = TYPES.includes(b.inquiryType) ? b.inquiryType : "OTHER"

    if (fullName.length < 2)         return res.status(400).json({ message: "Please enter your full name." })
    if (!PHONE_RX.test(phone))       return res.status(400).json({ message: "Please enter a valid phone number." })
    if (email && !EMAIL_RX.test(email)) return res.status(400).json({ message: "Please enter a valid email address or leave it blank." })
    if (message.length < 10)         return res.status(400).json({ message: "Please write a short message (at least 10 characters)." })
    if (message.length > 2000)       return res.status(400).json({ message: "Your message is too long (2000 characters maximum)." })

    const contact = await prisma.contactMessage.create({
      data: { fullName, phone, email: email || null, inquiryType, message, ipAddress: clientIp(req) },
    })

    notify(contact).catch((e) => console.error("Contact notification failed:", e.message))
    res.status(201).json({ message: "Thank you. Your message has been received and an administrator will contact you." })
  } catch (e) {
    console.error("submitContact error:", e.message)
    res.status(500).json({ message: "Something went wrong. Please try again." })
  }
}

// ---- GET /api/contact (super admin) --------------------------------------------------
exports.listContacts = async (req, res) => {
  try {
    const page   = Math.max(parseInt(req.query.page) || 1, 1)
    const limit  = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100)
    const status = clean(req.query.status)
    const search = clean(req.query.search)

    const where = {
      ...(STATUSES.includes(status) && { status }),
      ...(search && {
        OR: [
          { fullName: { contains: search, mode: "insensitive" } },
          { phone:    { contains: search } },
          { email:    { contains: search, mode: "insensitive" } },
          { message:  { contains: search, mode: "insensitive" } },
        ],
      }),
    }

    const [contacts, total, grouped] = await Promise.all([
      prisma.contactMessage.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: "desc" } }),
      prisma.contactMessage.count({ where }),
      prisma.contactMessage.groupBy({ by: ["status"], _count: { status: true } }),
    ])

    const count = (s) => grouped.find((g) => g.status === s)?._count.status || 0
    const stats = {
      new: count("NEW"), inProgress: count("IN_PROGRESS"), resolved: count("RESOLVED"),
      total: count("NEW") + count("IN_PROGRESS") + count("RESOLVED"),
    }
    res.json({ page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1), stats, contacts })
  } catch (e) {
    console.error("listContacts error:", e.message)
    res.status(500).json({ message: "Failed to load enquiries." })
  }
}

// ---- PATCH /api/contact/:id (super admin) --------------------------------------------
exports.updateContact = async (req, res) => {
  try {
    const existing = await prisma.contactMessage.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ message: "Enquiry not found." })

    const data = {}
    if (req.body?.status !== undefined) {
      if (!STATUSES.includes(req.body.status)) return res.status(400).json({ message: "Invalid status." })
      data.status = req.body.status
    }
    if (req.body?.adminNotes !== undefined) {
      const notes = clean(req.body.adminNotes)
      if (notes.length > 2000) return res.status(400).json({ message: "Notes are too long (2000 characters maximum)." })
      data.adminNotes = notes || null
    }
    if (!Object.keys(data).length) return res.status(400).json({ message: "Nothing to update." })

    const me = await prisma.user.findUnique({ where: { id: req.user.id }, select: { fullName: true } })
    data.handledById   = req.user.id
    data.handledByName = me?.fullName || null

    const contact = await prisma.contactMessage.update({ where: { id: existing.id }, data })
    await prisma.auditLog.create({
      data: { action: "UPDATE_CONTACT_MESSAGE", entity: "ContactMessage", entityId: existing.id, userId: req.user.id,
              details: data.status ? `Status -> ${data.status}` : "Notes updated" },
    }).catch(() => {})
    res.json({ message: "Enquiry updated", contact })
  } catch (e) {
    console.error("updateContact error:", e.message)
    res.status(500).json({ message: "Failed to update enquiry." })
  }
}

// ---- DELETE /api/contact/:id (super admin) -------------------------------------------
exports.deleteContact = async (req, res) => {
  try {
    const existing = await prisma.contactMessage.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ message: "Enquiry not found." })
    await prisma.contactMessage.delete({ where: { id: existing.id } })
    await prisma.auditLog.create({
      data: { action: "DELETE_CONTACT_MESSAGE", entity: "ContactMessage", entityId: existing.id, userId: req.user.id, details: existing.fullName },
    }).catch(() => {})
    res.json({ message: "Enquiry deleted" })
  } catch (e) {
    console.error("deleteContact error:", e.message)
    res.status(500).json({ message: "Failed to delete enquiry." })
  }
}