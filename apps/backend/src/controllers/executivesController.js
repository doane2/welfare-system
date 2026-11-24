const prisma = require("../lib/prisma")

const clean = (v) => (typeof v === "string" ? v.trim() : "")
const DEFAULT_ORDER = [
  ["assistant chair", 20], ["vice chair", 20], ["chair", 10], ["assistant secretary", 40], ["secretary", 30],
  ["assistant treasurer", 60], ["treasurer", 50], ["trustee", 70], ["patron", 90],
]
const defaultOrderFor = (position) => {
  const p = position.toLowerCase()
  const hit = DEFAULT_ORDER.find(([k]) => p.includes(k))
  return hit ? hit[1] : 100
}
const parseDate = (v) => {
  if (v === undefined) return undefined
  if (v === null || v === "") return null
  const d = new Date(v)
  if (isNaN(d.getTime())) throw Object.assign(new Error("Invalid date"), { status: 400 })
  return d
}
const audit = (userId, action, entityId, details) =>
  prisma.auditLog.create({ data: { action, entity: "Executive", entityId, userId, details } }).catch(() => {})
const fail = (res, e, label) => {
  if (e.status) return res.status(e.status).json({ message: e.message })
  console.error(`${label} error:`, e.message)
  res.status(500).json({ message: "Something went wrong. Please try again." })
}

// GET /api/executives  - any signed-in user sees active executives; super admins can pass ?all=true
exports.listExecutives = async (req, res) => {
  try {
    const all = req.query.all === "true" && req.user.role === "SUPER_ADMIN"
    const executives = await prisma.executive.findMany({
      where: all ? {} : { isActive: true },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    })
    res.json({ executives })
  } catch (e) { fail(res, e, "listExecutives") }
}

function buildData(body, partial) {
  const data = {}
  const set = (k, v) => { if (v !== undefined) data[k] = v }
  if (!partial || body.fullName !== undefined) {
    const n = clean(body.fullName)
    if (n.length < 2) throw Object.assign(new Error("Full name is required"), { status: 400 })
    data.fullName = n.slice(0, 120)
  }
  if (!partial || body.position !== undefined) {
    const p = clean(body.position)
    if (p.length < 2) throw Object.assign(new Error("Position is required"), { status: 400 })
    data.position = p.slice(0, 80)
  }
  set("phone", body.phone === undefined ? undefined : clean(body.phone).slice(0, 30) || null)
  set("email", body.email === undefined ? undefined : clean(body.email).slice(0, 160) || null)
  set("bio", body.bio === undefined ? undefined : clean(body.bio).slice(0, 600) || null)
  set("termStart", parseDate(body.termStart))
  set("termEnd", parseDate(body.termEnd))
  if (body.isActive !== undefined) data.isActive = !!body.isActive
  if (body.displayOrder !== undefined && body.displayOrder !== "" && body.displayOrder !== null) {
    const n = parseInt(body.displayOrder, 10)
    if (isNaN(n) || n < 0 || n > 10000) throw Object.assign(new Error("Display order must be a number between 0 and 10000"), { status: 400 })
    data.displayOrder = n
  }
  return data
}

exports.createExecutive = async (req, res) => {
  try {
    const data = buildData(req.body || {}, false)
    if (data.displayOrder === undefined) data.displayOrder = defaultOrderFor(data.position)
    const created = await prisma.executive.create({ data: { ...data, createdById: req.user.id } })
    audit(req.user.id, "CREATE_EXECUTIVE", created.id, `${created.position}: ${created.fullName}`)
    res.status(201).json({ message: "Executive added", executive: created })
  } catch (e) { fail(res, e, "createExecutive") }
}

exports.updateExecutive = async (req, res) => {
  try {
    const existing = await prisma.executive.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ message: "Executive not found" })
    const data = buildData(req.body || {}, true)
    if (!Object.keys(data).length) return res.status(400).json({ message: "Nothing to update" })
    const updated = await prisma.executive.update({ where: { id: existing.id }, data })
    audit(req.user.id, "UPDATE_EXECUTIVE", existing.id, `${updated.position}: ${updated.fullName}`)
    res.json({ message: "Executive updated", executive: updated })
  } catch (e) { fail(res, e, "updateExecutive") }
}

exports.deleteExecutive = async (req, res) => {
  try {
    const existing = await prisma.executive.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ message: "Executive not found" })
    await prisma.executive.delete({ where: { id: existing.id } })
    audit(req.user.id, "DELETE_EXECUTIVE", existing.id, `${existing.position}: ${existing.fullName}`)
    res.json({ message: "Executive removed" })
  } catch (e) { fail(res, e, "deleteExecutive") }
}
