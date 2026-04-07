const { PrismaClient } = require("@prisma/client")
const { PrismaPg } = require("@prisma/adapter-pg")
const { Pool } = require("pg")

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10, 
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000, // Increased to 5s for cloud stability
  ssl: {
    rejectUnauthorized: false // This is the manual override for Railway SSL
  }
})

const adapter = new PrismaPg(pool)

// 2. Prevent multiple instances of Prisma Client in development
// In production, we just export a new instance.
let prisma;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient({ adapter })
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient({ adapter })
  }
  prisma = global.prisma
}

module.exports = prisma