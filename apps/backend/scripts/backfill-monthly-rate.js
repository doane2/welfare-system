// Run: node scripts/backfill-monthly-rate.js
const prisma = require("../src/lib/prisma")

async function main() {
  console.log("🔄 Backfilling monthlyRate for existing members...")

  const members = await prisma.user.findMany({
    where:  { role: "MEMBER" },
    select: { id: true, memberType: true, monthlyRate: true, fullName: true },
  })

  console.log(`Found ${members.length} member(s)`)

  let updated = 0
  for (const m of members) {
    const correctRate = m.memberType === "FAMILY" ? 500 : 200
    if (!m.monthlyRate || Number(m.monthlyRate) !== correctRate) {
      await prisma.user.update({
        where: { id: m.id },
        data:  { monthlyRate: correctRate },
      })
      console.log(`  ✅ ${m.fullName} → ${m.memberType || "SINGLE"} → KES ${correctRate}/month`)
      updated++
    } else {
      console.log(`  ⏭  ${m.fullName} → already KES ${m.monthlyRate}/month`)
    }
  }

  console.log(`\n✅ Done — updated ${updated} of ${members.length} member(s)`)
}

main()
  .catch(e => { console.error("❌ Error:", e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
