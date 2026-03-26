const prisma = require("../lib/prisma")

// ── Action label map — makes raw action names human-readable ─────────────────
const ACTION_LABELS = {
  CREATE_ANNOUNCEMENT:      "Created announcement",
  UPDATE_ANNOUNCEMENT:      "Updated announcement",
  DELETE_ANNOUNCEMENT:      "Deleted announcement",
  CREATE_MEMBER:            "Created member",
  UPDATE_MEMBER:            "Updated member",
  DELETE_MEMBER:            "Deleted member",
  APPROVE_CONTRIBUTION:     "Approved contribution",
  REJECT_CONTRIBUTION:      "Rejected contribution",
  CREATE_CONTRIBUTION:      "Recorded contribution",
  APPROVE_PAYMENT:          "Approved payment",
  REJECT_PAYMENT:           "Rejected payment",
  CREATE_PAYMENT:           "Recorded payment",
  APPROVE_CLAIM:            "Approved claim",
  REJECT_CLAIM:             "Rejected claim",
  CREATE_CLAIM:             "Submitted claim",
  APPROVE_LOAN:             "Approved loan",
  REJECT_LOAN:              "Rejected loan",
  CREATE_LOAN:              "Applied for loan",
  ADD_LOAN_REPAYMENT:       "Recorded loan repayment",
  FLAG_MEMBER_DECEASED:     "Flagged member as deceased",
  FLAG_DEPENDENT_DECEASED:  "Flagged dependent as deceased",
  UNFLAG_MEMBER_DECEASED:   "Removed deceased flag",
  ADD_DEPENDENT:            "Added dependent",
  UPDATE_DEPENDENT:         "Updated dependent",
  REMOVE_DEPENDENT:         "Removed dependent",
  ADD_MEMBER_TO_GROUP:      "Added member to group",
  REMOVE_MEMBER_FROM_GROUP: "Removed member from group",
  CREATE_GROUP:             "Created group",
  UPDATE_GROUP:             "Updated group",
  DELETE_GROUP:             "Deleted group",
  LOGIN:                    "Logged in",
  PASSWORD_CHANGE:          "Changed password",
  PROFILE_UPDATE:           "Updated profile",
}

const ACTION_COLORS = {
  CREATE_ANNOUNCEMENT:      "#0369a1",
  UPDATE_ANNOUNCEMENT:      "#0369a1",
  DELETE_ANNOUNCEMENT:      "#dc2626",
  CREATE_MEMBER:            "#15803d",
  UPDATE_MEMBER:            "#b45309",
  DELETE_MEMBER:            "#dc2626",
  APPROVE_CONTRIBUTION:     "#15803d",
  REJECT_CONTRIBUTION:      "#dc2626",
  CREATE_CONTRIBUTION:      "#0369a1",
  APPROVE_PAYMENT:          "#15803d",
  REJECT_PAYMENT:           "#dc2626",
  CREATE_PAYMENT:           "#0369a1",
  APPROVE_CLAIM:            "#15803d",
  REJECT_CLAIM:             "#dc2626",
  CREATE_CLAIM:             "#7c3aed",
  APPROVE_LOAN:             "#15803d",
  REJECT_LOAN:              "#dc2626",
  CREATE_LOAN:              "#7c3aed",
  ADD_LOAN_REPAYMENT:       "#0369a1",
  FLAG_MEMBER_DECEASED:     "#64748b",
  FLAG_DEPENDENT_DECEASED:  "#64748b",
  UNFLAG_MEMBER_DECEASED:   "#b45309",
  ADD_DEPENDENT:            "#15803d",
  UPDATE_DEPENDENT:         "#b45309",
  REMOVE_DEPENDENT:         "#dc2626",
  ADD_MEMBER_TO_GROUP:      "#15803d",
  REMOVE_MEMBER_FROM_GROUP: "#dc2626",
  CREATE_GROUP:             "#15803d",
  UPDATE_GROUP:             "#b45309",
  DELETE_GROUP:             "#dc2626",
  LOGIN:                    "#475569",
  PASSWORD_CHANGE:          "#b45309",
  PROFILE_UPDATE:           "#b45309",
}

// ── GET /api/audit-logs — admin view (all logs) ───────────────────────────────
exports.getAuditLogs = async (req, res) => {
  try {
    const {
      page    = 1,
      limit   = 20,
      search  = "",
      action  = "",
      entity  = "",
      userId  = "",
      from    = "",
      to      = "",
    } = req.query

    const skip = (parseInt(page) - 1) * parseInt(limit)

    const where = {}

    // Filter by userId (for member's own logs)
    if (userId) where.userId = userId

    // Filter by action type
    if (action) where.action = action

    // Filter by entity
    if (entity) where.entity = entity

    // Date range filter
    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(from)
      if (to)   where.createdAt.lte = new Date(new Date(to).setHours(23, 59, 59, 999))
    }

    // Search across action and entity
    if (search) {
      where.OR = [
        { action:   { contains: search, mode: "insensitive" } },
        { entity:   { contains: search, mode: "insensitive" } },
        { entityId: { contains: search, mode: "insensitive" } },
      ]
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take:     parseInt(limit),
        orderBy:  { createdAt: "desc" },
        include: {
          user: {
            select: {
              id:           true,
              fullName:     true,
              memberNumber: true,
              role:         true,
              email:        true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ])

    // Stats — action type counts
    const allActions = await prisma.auditLog.groupBy({
      by:      ["action"],
      _count:  { action: true },
      orderBy: { _count: { action: "desc" } },
      take:    10,
    })

    // Today's log count
    const todayStart = new Date(); todayStart.setHours(0,0,0,0)
    const todayCount = await prisma.auditLog.count({
      where: { createdAt: { gte: todayStart } },
    })

    // This week's count
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7)
    const weekCount = await prisma.auditLog.count({
      where: { createdAt: { gte: weekStart } },
    })

    // Format logs with human-readable labels and colors
    const formatted = logs.map(log => ({
      ...log,
      label: ACTION_LABELS[log.action] || log.action.replace(/_/g, " ").toLowerCase(),
      color: ACTION_COLORS[log.action] || "#475569",
    }))

    res.json({
      page:       parseInt(page),
      limit:      parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      stats: {
        total,
        today:    todayCount,
        thisWeek: weekCount,
        topActions: allActions.map(a => ({
          action: a.action,
          label:  ACTION_LABELS[a.action] || a.action,
          count:  a._count.action,
          color:  ACTION_COLORS[a.action] || "#475569",
        })),
      },
      auditLogs: formatted,
    })
  } catch (error) {
    console.error("❌ getAuditLogs error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// ── GET /api/audit-logs/actions — list of all unique action types ─────────────
exports.getActionTypes = async (req, res) => {
  try {
    const actions = await prisma.auditLog.groupBy({
      by:      ["action"],
      _count:  { action: true },
      orderBy: { _count: { action: "desc" } },
    })
    res.json({
      actions: actions.map(a => ({
        action: a.action,
        label:  ACTION_LABELS[a.action] || a.action.replace(/_/g, " ").toLowerCase(),
        count:  a._count.action,
        color:  ACTION_COLORS[a.action] || "#475569",
      })),
    })
  } catch (error) {
    console.error("❌ getActionTypes error:", error.message)
    res.status(500).json({ error: error.message })
  }
}
