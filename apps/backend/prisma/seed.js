if (process.env.NODE_ENV !== 'production') { require("dotenv").config() }
const prisma = require("../src/lib/prisma")
const bcrypt = require("bcrypt")

async function main() {
  // ── Super Admin ───────────────────────────────────────────────────────────
  const superAdminEmail    = process.env.SUPER_ADMIN_EMAIL || "doanemusa561@gmail.com"
  const superAdminName     = process.env.SUPER_ADMIN_NAME || "Doane Musa"
  const superAdminRawPass  = process.env.SUPER_ADMIN_PASSWORD || "SuperSecure123!"
  const superAdminPassword = await bcrypt.hash(superAdminRawPass, 10)

  const superAdmin = await prisma.user.upsert({
    where:  { email: superAdminEmail },
    update: {
      fullName: superAdminName,
      password: superAdminPassword,
      role:     "SUPER_ADMIN",
      isActive: true,
    },
    create: {
      fullName: superAdminName,
      email:    superAdminEmail,
      password: superAdminPassword,
      role:     "SUPER_ADMIN",
      isActive: true,
    },
  })

  console.log("✅ Super Admin ready:", superAdmin.email)

  // ── Secretary ─────────────────────────────────────────────────────────────
  const secretaryEmail    = process.env.SECRETARY_EMAIL || "lauriemongina5@gmail.com"
  const secretaryName     = process.env.SECRETARY_NAME || "Laurie Mong'ina"
  const secretaryRawPass  = process.env.SECRETARY_PASSWORD || "SecretarySecure123!"
  const secretaryPassword = await bcrypt.hash(secretaryRawPass, 10)

  const secretary = await prisma.user.upsert({
    where:  { email: secretaryEmail },
    update: {
      fullName: secretaryName,
      password: secretaryPassword,
      role:     "SECRETARY",
      isActive: true,
    },
    create: {
      fullName: secretaryName,
      email:    secretaryEmail,
      password: secretaryPassword,
      role:     "SECRETARY",
      isActive: true,
    },
  })

  console.log("✅ Secretary ready:", secretary.email)

  // ── Treasurer ─────────────────────────────────────────────────────────────
  const treasurerEmail    = process.env.TREASURER_EMAIL || "treasurer@gmail.com"
  const treasurerName     = process.env.TREASURER_NAME || "Treasurer Name"
  const treasurerRawPass  = process.env.TREASURER_PASSWORD || "TreasurerSecure123!"
  const treasurerPassword = await bcrypt.hash(treasurerRawPass, 10)

  const treasurer = await prisma.user.upsert({
    where:  { email: treasurerEmail },
    update: {
      fullName: treasurerName,
      password: treasurerPassword,
      role:     "TREASURER",
      isActive: true,
    },
    create: {
      fullName: treasurerName,
      email:    treasurerEmail,
      password: treasurerPassword,
      role:     "TREASURER",
      isActive: true,
    },
  })

  console.log("✅ Treasurer ready:", treasurer.email)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })