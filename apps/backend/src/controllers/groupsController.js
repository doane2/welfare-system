const prisma = require("../lib/prisma")

// ── Safe group fields ──────────────────────────────────────────────────────────
const safeGroupFields = (g) => ({
  id:          g.id,
  name:        g.name,
  description: g.description,
  createdAt:   g.createdAt,
  updatedAt:   g.updatedAt,
})

// ── CREATE GROUP ───────────────────────────────────────────────────────────────
exports.createGroup = async (req, res) => {
  try {
    const { name, description } = req.body
    if (!name) return res.status(400).json({ message: "Group name is required" })

    const existing = await prisma.group.findFirst({ where: { name } })
    if (existing) return res.status(400).json({ message: "A group with this name already exists" })

    const group = await prisma.group.create({
      data: { name, description: description || null },
    })

    await prisma.auditLog.create({
      data: { action: "CREATE_GROUP", entity: "Group", entityId: group.id, userId: req.user.id },
    }).catch((e) => console.error("⚠️ Audit log failed:", e.message))

    console.log("✅ Group created:", group.id)
    res.status(201).json({ message: "Group created successfully", group: safeGroupFields(group) })

  } catch (error) {
    console.error("❌ createGroup error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ── GET ALL GROUPS ─────────────────────────────────────────────────────────────
exports.getGroups = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)

    const whereClause = {
      OR: [
        { name:        { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ],
    }

    const [groups, total] = await Promise.all([
      prisma.group.findMany({
        where:   whereClause,
        skip,
        take:    parseInt(limit),
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { members: true } } },
      }),
      prisma.group.count({ where: whereClause }),
    ])

    res.json({
      page:       parseInt(page),
      limit:      parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      groups:     groups.map((g) => ({
        ...safeGroupFields(g),
        memberCount: g._count.members,
        _count:      g._count,
      })),
    })

  } catch (error) {
    console.error("❌ getGroups error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ── GET SINGLE GROUP with members ──────────────────────────────────────────────
exports.getGroupById = async (req, res) => {
  try {
    const { id } = req.params

    const group = await prisma.group.findUnique({
      where:   { id },
      include: {
        members: {
          select: {
            id:           true,
            fullName:     true,
            email:        true,
            memberNumber: true,
            memberType:   true,
            isActive:     true,
            phone:        true,
          },
        },
        _count: { select: { members: true } },
      },
    })

    if (!group) return res.status(404).json({ message: "Group not found" })

    res.json({
      group: {
        ...safeGroupFields(group),
        memberCount: group._count.members,
        members:     group.members,
      },
    })

  } catch (error) {
    console.error("❌ getGroupById error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ── UPDATE GROUP ───────────────────────────────────────────────────────────────
exports.updateGroup = async (req, res) => {
  try {
    const { id } = req.params
    const { name, description } = req.body

    const existing = await prisma.group.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ message: "Group not found" })

    if (name && name !== existing.name) {
      const nameTaken = await prisma.group.findFirst({ where: { name } })
      if (nameTaken) return res.status(400).json({ message: "A group with this name already exists" })
    }

    const updateData = {}
    if (name)                updateData.name        = name
    if (description !== undefined) updateData.description = description

    if (Object.keys(updateData).length === 0)
      return res.status(400).json({ message: "No valid fields provided to update" })

    const updated = await prisma.group.update({ where: { id }, data: updateData })

    await prisma.auditLog.create({
      data: { action: "UPDATE_GROUP", entity: "Group", entityId: id, userId: req.user.id },
    }).catch((e) => console.error("⚠️ Audit log failed:", e.message))

    console.log("✅ Group updated:", id)
    res.json({ message: "Group updated successfully", group: safeGroupFields(updated) })

  } catch (error) {
    console.error("❌ updateGroup error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ── ADD MEMBER TO GROUP ────────────────────────────────────────────────────────
// Accepts EITHER memberId (UUID) OR memberNumber (e.g. MBR-2026-46844)
// Frontend now sends memberNumber — this handler supports both for backwards compat
exports.addMemberToGroup = async (req, res) => {
  try {
    const { id } = req.params          // group id
    const { memberId, memberNumber } = req.body

    // Validate at least one identifier was provided
    if (!memberId && !memberNumber) {
      return res.status(400).json({ message: "Provide either memberId or memberNumber" })
    }

    // Resolve the member ─────────────────────────────────────────────────────
    let member
    if (memberNumber) {
      // Look up by member number (what the frontend now sends)
      member = await prisma.user.findUnique({
        where: { memberNumber: memberNumber.trim() },
      })
      if (!member) {
        return res.status(404).json({
          message: `No member found with number "${memberNumber}". Check the number on the member's dashboard.`,
        })
      }
    } else {
      // Legacy: look up by UUID
      member = await prisma.user.findUnique({ where: { id: memberId } })
      if (!member) {
        return res.status(404).json({ message: "Member not found" })
      }
    }

    // Must be a MEMBER role (not an admin account)
    if (member.role !== "MEMBER") {
      return res.status(400).json({ message: "Only members can be added to groups" })
    }

    // Check group exists
    const group = await prisma.group.findUnique({ where: { id } })
    if (!group) return res.status(404).json({ message: "Group not found" })

    // Already in this group?
    if (member.groupId === id) {
      return res.status(400).json({
        message: `${member.fullName} (${member.memberNumber}) is already in this group`,
      })
    }

    // If member is in another group, move them (a member can only be in one group)
    if (member.groupId && member.groupId !== id) {
      console.log(`ℹ️  Moving ${member.memberNumber} from group ${member.groupId} to ${id}`)
    }

    await prisma.user.update({
      where: { id: member.id },
      data:  { groupId: id },
    })

    // Notify the member
    await prisma.notification.create({
      data: {
        userId:  member.id,
        channel: "IN_APP",
        title:   "Group assignment",
        message: `You have been added to the group "${group.name}".`,
        status:  "SENT",
      },
    }).catch(() => {})

    await prisma.auditLog.create({
      data: {
        action:   "ADD_MEMBER_TO_GROUP",
        entity:   "Group",
        entityId: id,
        userId:   req.user.id,
      },
    }).catch((e) => console.error("⚠️ Audit log failed:", e.message))

    console.log(`✅ Member ${member.memberNumber} added to group ${id}`)

    res.json({
      message: `${member.fullName} (${member.memberNumber}) added to group "${group.name}" successfully`,
    })

  } catch (error) {
    console.error("❌ addMemberToGroup error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ── REMOVE MEMBER FROM GROUP ───────────────────────────────────────────────────
exports.removeMemberFromGroup = async (req, res) => {
  try {
    const { id, memberId } = req.params

    const member = await prisma.user.findUnique({ where: { id: memberId } })
    if (!member || member.role !== "MEMBER")
      return res.status(404).json({ message: "Member not found" })

    if (member.groupId !== id)
      return res.status(400).json({ message: "Member is not in this group" })

    await prisma.user.update({
      where: { id: memberId },
      data:  { groupId: null },
    })

    // Notify the member
    const group = await prisma.group.findUnique({ where: { id }, select: { name: true } })
    await prisma.notification.create({
      data: {
        userId:  memberId,
        channel: "IN_APP",
        title:   "Group update",
        message: `You have been removed from the group "${group?.name || id}".`,
        status:  "SENT",
      },
    }).catch(() => {})

    await prisma.auditLog.create({
      data: {
        action:   "REMOVE_MEMBER_FROM_GROUP",
        entity:   "Group",
        entityId: id,
        userId:   req.user.id,
      },
    }).catch((e) => console.error("⚠️ Audit log failed:", e.message))

    console.log(`✅ Member ${memberId} removed from group ${id}`)
    res.json({ message: "Member removed from group successfully" })

  } catch (error) {
    console.error("❌ removeMemberFromGroup error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ── DELETE GROUP ───────────────────────────────────────────────────────────────
exports.deleteGroup = async (req, res) => {
  try {
    const { id } = req.params

    const group = await prisma.group.findUnique({
      where:   { id },
      include: { _count: { select: { members: true } } },
    })
    if (!group) return res.status(404).json({ message: "Group not found" })

    // Unassign all members before deleting
    if (group._count.members > 0) {
      await prisma.user.updateMany({
        where: { groupId: id },
        data:  { groupId: null },
      })
    }

    await prisma.group.delete({ where: { id } })

    await prisma.auditLog.create({
      data: {
        action:   "DELETE_GROUP",
        entity:   "Group",
        entityId: id,
        userId:   req.user.id,
      },
    }).catch((e) => console.error("⚠️ Audit log failed:", e.message))

    console.log("✅ Group deleted:", id)
    res.json({ message: "Group deleted successfully" })

  } catch (error) {
    console.error("❌ deleteGroup error:", error.message)
    res.status(500).json({ error: error.message })
  }
}
