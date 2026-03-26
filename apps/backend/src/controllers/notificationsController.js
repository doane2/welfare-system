const prisma = require("../lib/prisma")

// ── GET ALL NOTIFICATIONS (admin) ─────────────────────────────────────────────
exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, userId, channel, status } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)

    const where = {
      ...(userId  ? { userId }  : {}),
      ...(channel ? { channel } : {}),
      ...(status  ? { status }  : {}),
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, fullName: true, email: true, memberNumber: true } },
        },
      }),
      prisma.notification.count({ where }),
    ])

    res.json({
      page:       parseInt(page),
      limit:      parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      notifications,
    })
  } catch (error) {
    console.error("❌ getNotifications error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ── GET MY NOTIFICATIONS (logged-in user) ─────────────────────────────────────
exports.getMyNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)

    const where = { userId: req.user.id }

    const [notifications, total, unread] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: "desc" },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: req.user.id, status: "SENT" } }),
    ])

    res.json({
      page:       parseInt(page),
      limit:      parseInt(limit),
      total,
      unread,
      totalPages: Math.ceil(total / parseInt(limit)),
      notifications,
    })
  } catch (error) {
    console.error("❌ getMyNotifications error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ── MARK SINGLE AS READ ───────────────────────────────────────────────────────
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params
    const notif  = await prisma.notification.findUnique({ where: { id } })
    if (!notif) return res.status(404).json({ message: "Notification not found" })

    // Only owner or admin can mark as read
    if (req.user.role === "MEMBER" && notif.userId !== req.user.id)
      return res.status(403).json({ message: "Access denied" })

    await prisma.notification.update({
      where: { id },
      data:  { status: "READ" },
    })

    res.json({ message: "Marked as read" })
  } catch (error) {
    console.error("❌ markAsRead error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ── MARK ALL AS READ ──────────────────────────────────────────────────────────
exports.markAllAsRead = async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, status: "SENT" },
      data:  { status: "READ" },
    })
    res.json({ message: "All notifications marked as read" })
  } catch (error) {
    console.error("❌ markAllAsRead error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ── DELETE NOTIFICATION ───────────────────────────────────────────────────────
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params
    const notif  = await prisma.notification.findUnique({ where: { id } })
    if (!notif) return res.status(404).json({ message: "Notification not found" })

    if (req.user.role === "MEMBER" && notif.userId !== req.user.id)
      return res.status(403).json({ message: "Access denied" })

    await prisma.notification.delete({ where: { id } })
    res.json({ message: "Notification deleted" })
  } catch (error) {
    console.error("❌ deleteNotification error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ── CREATE NOTIFICATION (member → admin request e.g. beneficiary change) ──────
exports.createNotification = async (req, res) => {
  try {
    const { channel, title, message, targetRole } = req.body

    if (!title || !message)
      return res.status(400).json({ message: "title and message are required" })

    // Find target admins — exclude the requesting user themselves
    const targets = await prisma.user.findMany({
      where: {
        role: targetRole
          ? { in: [targetRole, "SUPER_ADMIN"] }
          : { in: ["SUPER_ADMIN", "SECRETARY"] },
        isActive: true,
        id: { not: req.user.id },    // ← never send to the requesting member
      },
      select: { id: true },
    })

    if (targets.length === 0) {
      return res.status(404).json({ message: "No admin recipients found" })
    }

    const results = await Promise.allSettled(
      targets.map(t =>
        prisma.notification.create({
          data: {
            userId:  t.id,
            channel: channel || "IN_APP",
            title,             // title includes [memberId] prefix added by frontend
            message,
            status:  "SENT",
            sentAt:  new Date(),
          },
        })
      )
    )

    const created = results.filter(r => r.status === "fulfilled").length
    console.log(`✅ Beneficiary request notifications sent to ${created} admin(s)`)

    res.status(201).json({
      message: `Request sent to ${created} admin(s)`,
    })
  } catch (error) {
    console.error("❌ createNotification error:", error.message)
    res.status(500).json({ error: error.message })
  }
}