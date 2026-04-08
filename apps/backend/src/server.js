if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

// ── ENV DEBUG ─────────────────────────────────────────────────────────────────
console.log("=== ENV DEBUG START ===");
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "SET" : "MISSING");
console.log("REDIS_URL:", process.env.REDIS_URL ? "SET" : "MISSING");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("=== ENV DEBUG END ===");

// ── Run migrations on startup (production only) ───────────────────────────────
if (process.env.NODE_ENV === "production") {
  const { execSync } = require("child_process");
  try {
    console.log("🔄 Running database migrations...");
    execSync("npx prisma migrate deploy --schema=./prisma/schema.prisma", {
  stdio: "inherit",
  cwd: require("path").join(__dirname, ".."),  // = apps/backend/
  env: process.env,
});
    console.log("✅ Migrations complete");
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    // Don't crash — server may still work if schema is already up to date
  }
}

const express = require("express");
const cors = require("cors");

// ── Infrastructure ────────────────────────────────────────────────────────────
const prisma = require("./lib/prisma");
const { getClient: getRedis } = require("./lib/redis");

if (process.env.ENABLE_BACKUP_SCHEDULER !== "false") {
  require("./scripts/backupScheduler");
}

const app = express();

// ── Flexible CORS ───────────────────────────────────────────────────────────
const allowedOriginsRegex = [
  /localhost:3000$/,
  /\.sdacrater\.org$/,
  /\.cratersda\.co\.ke$/,
  /cratersda\.co\.ke$/,
  /\.vercel\.app$/,
  /\.up\.railway\.app$/,
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const isAllowed = allowedOriginsRegex.some((regex) => regex.test(origin));
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`🚫 CORS Blocked: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// ── M-Pesa Raw Body Handling ─────────────────────────────────────────────────
const mpesaRawBody = express.raw({ type: "*/*" });
const parseMpesaBody = (req, res, next) => {
  try {
    if (Buffer.isBuffer(req.body)) req.body = JSON.parse(req.body.toString());
    next();
  } catch (err) {
    res.status(400).send("Invalid JSON body");
  }
};
app.use("/api/mpesa/stk-callback", mpesaRawBody, parseMpesaBody);
app.use("/api/mpesa/c2b-confirmation", mpesaRawBody, parseMpesaBody);
app.use("/api/mpesa/c2b-validation", mpesaRawBody, parseMpesaBody);

app.use(express.json());

// ── Root Route (For Railway Healthchecks) ─────────────────────────────────────
app.get("/", (req, res) => res.send("SDA Welfare API Online"));

// ── Routes ──────────────────────────────────────────────────────────────────
const authRoutes = require("./routes/auth");
const membersRoutes = require("./routes/members");
const groupsRoutes = require("./routes/groups");
const contributionsRoutes = require("./routes/contributions");
const paymentsRoutes = require("./routes/payments");
const claimsRoutes = require("./routes/claims");
const loansRoutes = require("./routes/loans");
const loanRepaymentsRoutes = require("./routes/loanRepayments");
const notificationsRoutes = require("./routes/notifications");
const announcementsRoutes = require("./routes/announcements");
const uploadsRoutes = require("./routes/uploads");
const dashboardRoutes = require("./routes/dashboard");
const mpesaRoutes = require("./routes/mpesa");
const beneficiaryRequestsRoutes = require("./routes/beneficiaryRequests");
const reportsRoutes = require("./routes/reports");
const auditLogsRoutes = require("./routes/auditLogs");

// ── API Route Mapping ────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/members", membersRoutes);
app.use("/api/groups", groupsRoutes);
app.use("/api/contributions", contributionsRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/claims", claimsRoutes);
app.use("/api/loans", loansRoutes);
app.use("/api/loan-repayments", loanRepaymentsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/announcements", announcementsRoutes);
app.use("/api/uploads", uploadsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/mpesa", mpesaRoutes);
app.use("/api/dependents", require("./routes/dependents"));
app.use("/api/beneficiary-requests", beneficiaryRequestsRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/audit-logs", auditLogsRoutes);

// ── Detailed Health Check ─────────────────────────────────────────────────────
app.get("/health", async (req, res) => {
  const checks = { db: "unknown", redis: "unknown" };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db = "ok";
  } catch (e) {
    console.error("DB Health Error:", e.message);
    checks.db = "error";
  }

  try {
    const redis = getRedis();
    if (redis) {
      await redis.ping();
      checks.redis = "ok";
    } else {
      checks.redis = "disabled";
    }
  } catch (e) {
    console.error("Redis Health Error:", e.message);
    checks.redis = "error";
  }

  const healthy = checks.db === "ok";
  res.status(healthy ? 200 : 503).json({ 
    status: healthy ? "ok" : "degraded", 
    checks 
  });
});

// ── Server Start ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server live on port ${PORT}`);
  const redis = getRedis();
  if (redis) redis.ping().catch(() => {});
});

// ── Graceful Shutdown ─────────────────────────────────────────────────────────
const shutdown = async (signal) => {
  console.log(`⚠️ Received ${signal}, shutting down...`);
  server.close(async () => {
    await prisma.$disconnect();
    const redis = getRedis();
    if (redis) await redis.quit();
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));