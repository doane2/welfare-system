const { PrismaClient } = require("@prisma/client")
const { PrismaPg } = require("@prisma/adapter-pg")
const { Pool } = require("pg")

// 1. Configure the connection pool
// Railway's hobby/starter plans have connection limits. 
// Setting max: 10 is a safe starting point for production.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10, 
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
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