if (process.env.NODE_ENV !== "production") { require("dotenv").config() }
const prisma = require("../src/lib/prisma")
const bcrypt = require("bcrypt")
const crypto = require("crypto")

// Seeds ONLY the primary super admin. All other admins are added from the super admin dashboard.
async function main() {
  const email = (process.env.SUPER_ADMIN_EMAIL || "doanemusa561@gmail.com").trim()
  const name = process.env.SUPER_ADMIN_NAME || "Doane Musa"
  const rawPass = process.env.SUPER_ADMIN_PASSWORD // optional on re-runs

  const existing = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } })

  // Guarantee a single primary
  await prisma.user.updateMany({ where: { isPrimary: true, ...(existing && { id: { not: existing.id } }) }, data: { isPrimary: false } })

  if (existing) {
    const data = { fullName: name, role: "SUPER_ADMIN", isPrimary: true, isActive: true, accountStatus: "ACTIVE", mustChangePassword: false }
    if (rawPass) { data.password = await bcrypt.hash(rawPass, 10); data.tokenVersion = { increment: 1 } }
    await prisma.user.update({ where: { id: existing.id }, data })
    console.log("Primary super admin updated:", existing.email, rawPass ? "(password reset from SUPER_ADMIN_PASSWORD)" : "(password unchanged)")
  } else {
    const pass = rawPass || crypto.randomBytes(12).toString("base64").replace(/[^a-zA-Z0-9]/g, "") + "#9a"
    await prisma.user.create({
      data: { fullName: name, email, password: await bcrypt.hash(pass, 10), role: "SUPER_ADMIN", isPrimary: true, isActive: true, accountStatus: "ACTIVE" },
    })
    console.log("Primary super admin created:", email)
    if (!rawPass) console.log("Generated password (shown once, change it after first login):", pass)
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
