// One-off / re-runnable: marks the primary super admin and enforces "only one primary" at database level.
// Run after `npx prisma db push`:   node scripts/admin-update-setup.js
if (process.env.NODE_ENV !== "production") { require("dotenv").config() }
const prisma = require("../src/lib/prisma")
const { ADMIN_ROLES, ROLE_LIMITS } = require("../src/lib/adminPolicy")

async function main() {
  const email = (process.env.SUPER_ADMIN_EMAIL || "doanemusa561@gmail.com").trim()
  const primary = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } })
  if (!primary) throw new Error(`No user found with email ${email}. Set SUPER_ADMIN_EMAIL or run: node prisma/seed.js`)
  if (primary.role !== "SUPER_ADMIN") throw new Error(`${email} is not a SUPER_ADMIN`)

  await prisma.user.updateMany({ where: { isPrimary: true, id: { not: primary.id } }, data: { isPrimary: false } })
  await prisma.user.update({
    where: { id: primary.id },
    data: { isPrimary: true, mustChangePassword: false, isActive: true, accountStatus: "ACTIVE" },
  })
  console.log("Primary super admin:", primary.email)

  try {
    await prisma.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "User_single_primary_idx" ON "User" ("isPrimary") WHERE "isPrimary" = true`
    )
    console.log("Single-primary database guard: OK")
  } catch (e) {
    console.warn("Could not create single-primary index (app-level protection still applies):", e.message)
  }

  for (const role of ADMIN_ROLES) {
    const n = await prisma.user.count({ where: { role, accountStatus: "ACTIVE" } })
    console.log(`${role}: ${n}/${ROLE_LIMITS[role]} active${n > ROLE_LIMITS[role] ? "  <-- OVER LIMIT, deactivate extras from the dashboard" : ""}`)
  }
}

main()
  .catch((e) => { console.error(e.message); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
