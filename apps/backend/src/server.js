/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Changes vs original:
 *   • Prisma connection pool size set via DATABASE_URL param
 *   • Redis client initialised at startup with health check
 *   • Backup scheduler wired in (runs daily at 02:00 EAT)
 *   • /health endpoint now reports Redis + DB status
 *   • Graceful shutdown: closes Redis + Prisma on SIGTERM/SIGINT
 * ─────────────────────────────────────────────────────────────────────────────
 */

require("dotenv").config()

const express = require("express")
const cors    = require("cors")

// ── Phase 1 routes ────────────────────────────────────────────────────────────
const authRoutes            = require("./routes/auth")
const membersRoutes         = require("./routes/members")
const groupsRoutes          = require("./routes/groups")
const contributionsRoutes   = require("./routes/contributions")
const paymentsRoutes        = require("./routes/payments")
const claimsRoutes          = require("./routes/claims")
const loansRoutes           = require("./routes/loans")
const loanRepaymentsRoutes  = require("./routes/loanRepayments")
const notificationsRoutes   = require("./routes/notifications")
const announcementsRoutes   = require("./routes/announcements")
const uploadsRoutes         = require("./routes/uploads")

// ── Phase 2 routes ────────────────────────────────────────────────────────────
const dashboardRoutes           = require("./routes/dashboard")
const mpesaRoutes               = require("./routes/mpesa")
const beneficiaryRequestsRoutes = require("./routes/beneficiaryRequests")

// ── Phase 3 routes ────────────────────────────────────────────────────────────
const reportsRoutes   = require("./routes/reports")

// ── Phase 4 routes ────────────────────────────────────────────────────────────
const auditLogsRoutes = require("./routes/auditLogs")

// ── Infrastructure ────────────────────────────────────────────────────────────
const prisma            = require("./lib/prisma")
const { getClient: getRedis } = require("./lib/redis")

// ── Backup scheduler (runs daily at 02:00 EAT inside the process) ─────────────
// Remove this line if you use an external cron job instead
if (process.env.ENABLE_BACKUP_SCHEDULER !== "false") {
  require("./scripts/backupScheduler")
}

const app = express()

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://app.cratersda.co.ke",
    "https://cratersda.co.ke",
  ],
  credentials: true,
}))

// Raw body for M-Pesa webhooks (must come before express.json)
const mpesaRawBody = express.raw({ type: "*/*" })
const parseMpesaBody = (req, res, next) => {
  if (Buffer.isBuffer(req.body)) req.body = JSON.parse(req.body.toString())
  next()
}
app.use("/api/mpesa/stk-callback",     mpesaRawBody, parseMpesaBody)
app.use("/api/mpesa/c2b-confirmation", mpesaRawBody, parseMpesaBody)
app.use("/api/mpesa/c2b-validation",   mpesaRawBody, parseMpesaBody)

app.use(express.json())

// ── API Routes ────────────────────────────────────────────────────────────────
// Phase 1
app.use("/api/auth",            authRoutes)
app.use("/api/members",         membersRoutes)
app.use("/api/groups",          groupsRoutes)
app.use("/api/contributions",   contributionsRoutes)
app.use("/api/payments",        paymentsRoutes)
app.use("/api/claims",          claimsRoutes)
app.use("/api/loans",           loansRoutes)
app.use("/api/loan-repayments", loanRepaymentsRoutes)
app.use("/api/notifications",   notificationsRoutes)
app.use("/api/announcements",   announcementsRoutes)
app.use("/api/uploads",         uploadsRoutes)

// Phase 2
app.use("/api/dashboard",            dashboardRoutes)
app.use("/api/mpesa",                mpesaRoutes)
app.use("/api/dependents",           require("./routes/dependents"))
app.use("/api/beneficiary-requests", beneficiaryRequestsRoutes)

// Phase 3
app.use("/api/reports",     reportsRoutes)

// Phase 4
app.use("/api/audit-logs",  auditLogsRoutes)

// ── Health check (now includes Redis + DB status) ─────────────────────────────
app.get("/health", async (req, res) => {
  const checks = { db: "unknown", redis: "unknown" }

  // Check DB
  try {
    await prisma.$queryRaw`SELECT 1`
    checks.db = "ok"
  } catch {
    checks.db = "error"
  }

  // Check Redis
  try {
    const redis = getRedis()
    if (redis) {
      await redis.ping()
      checks.redis = "ok"
    } else {
      checks.redis = "disabled"
    }
  } catch {
    checks.redis = "error"
  }

  const healthy   = checks.db === "ok"
  const statusCode = healthy ? 200 : 503

  res.status(statusCode).json({
    status:    healthy ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    phase:     "4",
    checks,
    modules: [
      "auth", "members", "groups", "contributions", "payments",
      "claims", "loans", "notifications", "announcements",
      "dashboard", "mpesa", "reports", "audit-logs", "beneficiary-requests"
    ],
  })
})

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.url} not found` })
})

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("❌ Unhandled error:", err.message)
  res.status(500).json({ error: "Internal server error" })
})

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000
const server = app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`)
  console.log(`📋 Health: http://localhost:${PORT}/health`)
  console.log(`🌍 Phase 5 active - DB Optimization + Automatic Backup + Caching`)

  // Warm Redis connection at startup
  const redis = getRedis()
  if (redis) redis.ping().catch(() => {})
})

// ── Graceful shutdown ─────────────────────────────────────────────────────────
const shutdown = async (signal) => {
  console.log(`\n${signal} received — shutting down gracefully...`)

  server.close(async () => {
    try {
      await prisma.$disconnect()
      console.log("✅ Prisma disconnected")

      const redis = getRedis()
      if (redis) {
        await redis.quit()
        console.log("✅ Redis disconnected")
      }
    } catch (err) {
      console.error("⚠️ Shutdown error:", err.message)
    }
    process.exit(0)
  })
}

process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("SIGINT",  () => shutdown("SIGINT"))
