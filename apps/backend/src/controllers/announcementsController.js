const prisma = require("../lib/prisma")
const { sendAnnouncementEmail } = require("../services/emailService")
const { sendAnnouncementSMS }   = require("../services/smsService")

const safeFields = (a) => ({
  id:           a.id,
  title:        a.title,
  content:      a.content,
  active:       a.active,
  priority:     a.priority     || false,
  attachmentUrl:a.attachmentUrl|| null,
  createdAt:    a.createdAt,
  updatedAt:    a.updatedAt,
})

// ── CREATE ────────────────────────────────────────────────────────────────────
exports.createAnnouncement = async (req, res) => {
  try {
    const { title, content, active, priority, attachmentUrl } = req.body
    if (!title || !content)
      return res.status(400).json({ message: "title and content are required" })

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        active:        active    !== undefined ? active    : true,
        priority:      priority  !== undefined ? priority  : false,
        attachmentUrl: attachmentUrl || null,
      },
    })

    await prisma.auditLog.create({
      data: { action:"CREATE_ANNOUNCEMENT", entity:"Announcement", entityId:announcement.id, userId:req.user.id }
    }).catch(() => {})

    // Notify all active members if announcement is active
    if (announcement.active) {
      const activeMembers = await prisma.user.findMany({
        where:  { role:"MEMBER", isActive:true },
        select: { email:true, fullName:true, phone:true },
      })
      console.log(`📢 Notifying ${activeMembers.length} members...`)
      Promise.allSettled([
        ...activeMembers.map(m => sendAnnouncementEmail({ email:m.email, fullName:m.fullName, title:announcement.title, content:announcement.content })),
        sendAnnouncementSMS(activeMembers.map(m => ({ phone:m.phone })), announcement.title),
      ]).then(results => {
        const ok  = results.filter(r => r.status === "fulfilled").length
        const bad = results.filter(r => r.status === "rejected").length
        console.log(`📢 Notifications: ${ok} sent, ${bad} failed`)
      })
    }

    res.status(201).json({ message:"Announcement created successfully", announcement:safeFields(announcement) })
  } catch (error) {
    console.error("❌ createAnnouncement:", error.message)
    res.status(500).json({ error:error.message })
  }
}

// ── GET ALL (admin) ───────────────────────────────────────────────────────────
exports.getAnnouncements = async (req, res) => {
  try {
    const { page=1, limit=20, active, search="" } = req.query
    const skip = (parseInt(page)-1) * parseInt(limit)

    const where = {
      ...(active !== undefined && { active: active==="true" }),
      ...(search && { OR: [
        { title:   { contains:search, mode:"insensitive" } },
        { content: { contains:search, mode:"insensitive" } },
      ]}),
    }

    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({
        where, skip, take:parseInt(limit),
        orderBy: [{ priority:"desc" }, { createdAt:"desc" }],
      }),
      prisma.announcement.count({ where }),
    ])

    const activeCount   = await prisma.announcement.count({ where:{ active:true  } })
    const inactiveCount = await prisma.announcement.count({ where:{ active:false } })
    const priorityCount = await prisma.announcement.count({ where:{ priority:true} })

    res.json({
      page:parseInt(page), limit:parseInt(limit), total,
      totalPages: Math.ceil(total/parseInt(limit)),
      stats: { total, active:activeCount, inactive:inactiveCount, priority:priorityCount },
      announcements,
    })
  } catch (error) {
    console.error("❌ getAnnouncements:", error.message)
    res.status(500).json({ error:error.message })
  }
}

// ── GET ACTIVE (member dashboard) ─────────────────────────────────────────────
exports.getActiveAnnouncements = async (req, res) => {
  try {
    const announcements = await prisma.announcement.findMany({
      where:   { active:true },
      orderBy: [{ priority:"desc" }, { createdAt:"desc" }],
      take:    20,
    })
    res.json({ announcements })
  } catch (error) {
    console.error("❌ getActiveAnnouncements:", error.message)
    res.status(500).json({ error:error.message })
  }
}

// ── GET SINGLE ────────────────────────────────────────────────────────────────
exports.getAnnouncementById = async (req, res) => {
  try {
    const a = await prisma.announcement.findUnique({ where:{ id:req.params.id } })
    if (!a) return res.status(404).json({ message:"Announcement not found" })
    res.json({ announcement:safeFields(a) })
  } catch (error) {
    console.error("❌ getAnnouncementById:", error.message)
    res.status(500).json({ error:error.message })
  }
}

// ── UPDATE ────────────────────────────────────────────────────────────────────
exports.updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params
    const existing = await prisma.announcement.findUnique({ where:{ id } })
    if (!existing) return res.status(404).json({ message:"Announcement not found" })

    const { title, content, active, priority, attachmentUrl } = req.body
    const data = {}
    if (title         !== undefined) data.title         = title
    if (content       !== undefined) data.content       = content
    if (active        !== undefined) data.active        = active
    if (priority      !== undefined) data.priority      = priority
    if (attachmentUrl !== undefined) data.attachmentUrl = attachmentUrl

    if (!Object.keys(data).length)
      return res.status(400).json({ message:"No valid fields to update" })

    const updated = await prisma.announcement.update({ where:{ id }, data })

    await prisma.auditLog.create({
      data: { action:"UPDATE_ANNOUNCEMENT", entity:"Announcement", entityId:id, userId:req.user.id }
    }).catch(() => {})

    res.json({ message:"Announcement updated", announcement:safeFields(updated) })
  } catch (error) {
    console.error("❌ updateAnnouncement:", error.message)
    res.status(500).json({ error:error.message })
  }
}

// ── TOGGLE ACTIVE ─────────────────────────────────────────────────────────────
exports.toggleAnnouncement = async (req, res) => {
  try {
    const existing = await prisma.announcement.findUnique({ where:{ id:req.params.id } })
    if (!existing) return res.status(404).json({ message:"Announcement not found" })
    const updated = await prisma.announcement.update({
      where:{ id:req.params.id }, data:{ active:!existing.active }
    })
    res.json({ message:`Announcement ${updated.active?"activated":"deactivated"}`, announcement:safeFields(updated) })
  } catch (error) {
    console.error("❌ toggleAnnouncement:", error.message)
    res.status(500).json({ error:error.message })
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────
exports.deleteAnnouncement = async (req, res) => {
  try {
    const existing = await prisma.announcement.findUnique({ where:{ id:req.params.id } })
    if (!existing) return res.status(404).json({ message:"Announcement not found" })
    await prisma.announcement.delete({ where:{ id:req.params.id } })
    await prisma.auditLog.create({
      data: { action:"DELETE_ANNOUNCEMENT", entity:"Announcement", entityId:req.params.id, userId:req.user.id }
    }).catch(() => {})
    res.json({ message:"Announcement deleted" })
  } catch (error) {
    console.error("❌ deleteAnnouncement:", error.message)
    res.status(500).json({ error:error.message })
  }
}
