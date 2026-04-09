if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

// ── ENV DEBUG ─────────────────────────────────────────────────────────────────
console.log("=== ENV DEBUG START ===");
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "SET" : "MISSING");
console.log("REDIS_URL:", process.env.REDIS_URL ? "SET" : "MISSING");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("=== ENV DEBUG END ===");

// ── MIGRATIONS NOTE ──────────────────────────────────────────────────────────
// Manual migrations are handled via 'npx prisma db push' locally to 
// prevent startup timeouts on Render's free tier.

const express = require("express");
const cors = require("cors");
const prisma = require("./lib/prisma");
const { getClient: getRedis } = require("./lib/redis");

// ── Infrastructure & Scripts ──────────────────────────────────────────────────
if (process.env.ENABLE_BACKUP_SCHEDULER !== "false") {
  try {
    require("./scripts/backupScheduler");
    console.log("✅ Backup scheduler registered");
  } catch (err) {
    console.error("⚠️ Backup scheduler failed to load:", err.message);
  }
}

const app = express();

// ── Flexible CORS ───────────────────────────────────────────────────────────
const allowedOriginsRegex = [
  /localhost:3000$/,
  /\.sdacrater\.org$/,
  /\.cratersda\.co\.ke$/,
  /cratersda\.co\.ke$/,
  /\.vercel\.app$/,
  /\.onrender\.com$/, // Added to allow Render internal communication
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

// ── Root Route ──────────────────────────────────────────────────────────────
app.get("/", (req, res) => res.send("SDA Welfare API Online"));

// ── API Route Mapping ────────────────────────────────────────────────────────
app.use("/api/auth", require("./routes/auth"));
app.use("/api/members", require("./routes/members"));
app.use("/api/groups", require("./routes/groups"));
app.use("/api/contributions", require("./routes/contributions"));
app.use("/api/payments", require("./routes/payments"));
app.use("/api/claims", require("./routes/claims"));
app.use("/api/loans", require("./routes/loans"));
app.use("/api/loan-repayments", require("./routes/loanRepayments"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/announcements", require("./routes/announcements"));
app.use("/api/uploads", require("./routes/uploads"));
app.use("/api/dashboard", require("./routes/dashboard"));
app.use("/api/mpesa", require("./routes/mpesa"));
app.use("/api/dependents", require("./routes/dependents"));
app.use("/api/beneficiary-requests", require("./routes/beneficiaryRequests"));
app.use("/api/reports", require("./routes/reports"));
app.use("/api/audit-logs", require("./routes/auditLogs"));

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
  if (redis) {
    redis.ping()
      .then(() => console.log("✅ Redis connected"))
      .catch((err) => console.error("❌ Redis connection failed:", err.message));
  }
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