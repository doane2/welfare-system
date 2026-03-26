require("dotenv").config()
const prisma = require("../src/lib/prisma")
const bcrypt = require("bcrypt")

async function main() {
  // ── Super Admin ───────────────────────────────────────────────────────────
  const superAdminEmail    = "doanemusa561@gmail.com"
  const superAdminPassword = await bcrypt.hash("SuperSecure123!", 10)

  const superAdmin = await prisma.user.upsert({
    where:  { email: superAdminEmail },
    update: {
      fullName: "Doane Musa",
      password: superAdminPassword,
      role:     "SUPER_ADMIN",
      isActive: true,
    },
    create: {
      fullName: "Doane Musa",
      email:    superAdminEmail,
      password: superAdminPassword,
      role:     "SUPER_ADMIN",
      isActive: true,
    },
  })

  console.log("✅ Super Admin ready:", superAdmin.email)

  // ── Secretary ─────────────────────────────────────────────────────────────
  const secretaryEmail    = "lauriemongina5@gmail.com"
  const secretaryPassword = await bcrypt.hash("SecretarySecure123!", 10)

  const secretary = await prisma.user.upsert({
    where:  { email: secretaryEmail },
    update: {
      fullName: "Laurie Mong'ina",
      password: secretaryPassword,
      role:     "SECRETARY",
      isActive: true,
    },
    create: {
      fullName: "Laurie Mong'ina",
      email:    secretaryEmail,
      password: secretaryPassword,
      role:     "SECRETARY",
      isActive: true,
    },
  })

  console.log("✅ Secretary ready:", secretary.email)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })