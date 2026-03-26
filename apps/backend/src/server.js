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
const dashboardRoutes       = require("./routes/dashboard")
const mpesaRoutes           = require("./routes/mpesa")
const beneficiaryRequestsRoutes = require("./routes/beneficiaryRequests") // Added here

// ── Phase 3 routes ────────────────────────────────────────────────────────────
const reportsRoutes         = require("./routes/reports")

// ── Phase 4 routes ────────────────────────────────────────────────────────────
const auditLogsRoutes       = require("./routes/auditLogs")

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
app.use("/api/mpesa/stk-callback",     express.raw({ type: "*/*" }), (req, res, next) => {
  if (Buffer.isBuffer(req.body)) req.body = JSON.parse(req.body.toString())
  next()
})
app.use("/api/mpesa/c2b-confirmation", express.raw({ type: "*/*" }), (req, res, next) => {
  if (Buffer.isBuffer(req.body)) req.body = JSON.parse(req.body.toString())
  next()
})
app.use("/api/mpesa/c2b-validation",   express.raw({ type: "*/*" }), (req, res, next) => {
  if (Buffer.isBuffer(req.body)) req.body = JSON.parse(req.body.toString())
  next()
})

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
app.use("/api/beneficiary-requests", beneficiaryRequestsRoutes) // Added here

// Phase 3
app.use("/api/reports",         reportsRoutes)

// Phase 4
app.use("/api/audit-logs",      auditLogsRoutes)

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status:    "ok",
    timestamp: new Date().toISOString(),
    phase:     "4",
    modules:   [
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
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`)
  console.log(`📋 Health: http://localhost:${PORT}/health`)
  console.log(`🌍 Phase 4 active — Audit logs + Announcements board registered`)
})