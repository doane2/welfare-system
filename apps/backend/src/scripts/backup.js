#!/usr/bin/env node
/**
 * scripts/backup.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Automated PostgreSQL backup for the Welfare Management System.
 *
 * WHAT IT DOES
 *   1. Runs pg_dump → compressed .sql.gz file in ./backups/
 *   2. Uploads to Cloudflare R2 (S3-compatible, ~$0.015/GB — cheapest option)
 *   3. Deletes local files older than RETAIN_LOCAL_DAYS (default 7)
 *   4. Deletes R2 files older than RETAIN_R2_DAYS    (default 90)
 *   5. Logs every step — safe to run from cron or Railway cron job
 *
 * SETUP
 *   npm install @aws-sdk/client-s3 dotenv
 *
 *   Add to .env:
 *     DATABASE_URL=postgresql://user:pass@host:5432/dbname
 *
 *     # Cloudflare R2 — get from R2 > Manage R2 API Tokens
 *     R2_ACCOUNT_ID=your_account_id
 *     R2_ACCESS_KEY_ID=your_access_key
 *     R2_SECRET_ACCESS_KEY=your_secret_key
 *     R2_BUCKET_NAME=welfare-backups
 *
 *     RETAIN_LOCAL_DAYS=7    # optional, default 7
 *     RETAIN_R2_DAYS=90      # optional, default 90
 *
 * SCHEDULING OPTIONS (pick one)
 *
 *   Option A — Railway cron job (recommended if hosted on Railway):
 *     In Railway dashboard → your service → Settings → Cron
 *     Command:  node scripts/backup.js
 *     Schedule: 0 2 * * *    ← runs at 02:00 UTC daily
 *
 *   Option B — Linux cron (VPS / on-premise):
 *     crontab -e
 *     0 2 * * * cd /path/to/your/app && node scripts/backup.js >> /var/log/welfare-backup.log 2>&1
 *
 *   Option C — Node cron (runs inside the app process):
 *     See scripts/backupScheduler.js
 *
 * RESTORE
 *   gunzip -c backup_file.sql.gz | psql "$DATABASE_URL"
 * ─────────────────────────────────────────────────────────────────────────────
 */

if (process.env.NODE_ENV !== 'production') { require("dotenv").config() }

const { execSync, exec }  = require("child_process")
const fs                  = require("fs")
const path                = require("path")
const { promisify }       = require("util")
const execAsync           = promisify(exec)

const {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} = require("@aws-sdk/client-s3")

// ── Config ─────────────────────────────────────────────────────────────────
const BACKUP_DIR       = path.join(__dirname, "../backups")
const RETAIN_LOCAL     = parseInt(process.env.RETAIN_LOCAL_DAYS || "7",  10)
const RETAIN_R2        = parseInt(process.env.RETAIN_R2_DAYS    || "90", 10)
const DB_URL           = process.env.DATABASE_URL

const R2_ACCOUNT_ID    = process.env.R2_ACCOUNT_ID
const R2_ACCESS_KEY    = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_KEY    = process.env.R2_SECRET_ACCESS_KEY
const R2_BUCKET        = process.env.R2_BUCKET_NAME || "welfare-backups"

// ── Helpers ─────────────────────────────────────────────────────────────────
const log  = (msg) => console.log(`[${new Date().toISOString()}] ✅  ${msg}`)
const warn = (msg) => console.warn(`[${new Date().toISOString()}] ⚠️   ${msg}`)
const fail = (msg) => { console.error(`[${new Date().toISOString()}] ❌  ${msg}`); process.exit(1) }

const formatBytes = (bytes) => {
  if (bytes < 1024)         return `${bytes} B`
  if (bytes < 1024 ** 2)   return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 ** 3)   return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`
}

// ── Parse DATABASE_URL → pg_dump env vars ───────────────────────────────────
const parseDatabaseUrl = (url) => {
  try {
    const u = new URL(url)
    return {
      PGHOST:     u.hostname,
      PGPORT:     u.port || "5432",
      PGDATABASE: u.pathname.replace(/^\//, ""),
      PGUSER:     u.username,
      PGPASSWORD: u.password,
    }
  } catch {
    fail("DATABASE_URL is not a valid PostgreSQL connection string")
  }
}

// ── R2 Client ──────────────────────────────────────────────────────────────
const getR2Client = () => {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY || !R2_SECRET_KEY) {
    warn("R2 credentials not set — skipping cloud upload")
    return null
  }

  return new S3Client({
    region:   "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId:     R2_ACCESS_KEY,
      secretAccessKey: R2_SECRET_KEY,
    },
  })
}

// ── Step 1: Run pg_dump ────────────────────────────────────────────────────
const runPgDump = async () => {
  if (!DB_URL) fail("DATABASE_URL is not set in .env")

  fs.mkdirSync(BACKUP_DIR, { recursive: true })

  const timestamp  = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
  const filename   = `welfare_backup_${timestamp}.sql.gz`
  const outputPath = path.join(BACKUP_DIR, filename)

  const pgEnv      = parseDatabaseUrl(DB_URL)
  const dumpCmd    = `pg_dump --no-owner --no-acl -Fp | gzip > "${outputPath}"`

  log(`Starting pg_dump → ${filename}`)

  try {
    await execAsync(dumpCmd, { env: { ...process.env, ...pgEnv } })
  } catch (err) {
    fail(`pg_dump failed: ${err.message}`)
  }

  const stats = fs.statSync(outputPath)
  log(`Backup created: ${filename} (${formatBytes(stats.size)})`)

  return { filename, outputPath, size: stats.size }
}

// ── Step 2: Upload to Cloudflare R2 ─────────────────────────────────────────
const uploadToR2 = async (outputPath, filename) => {
  const r2 = getR2Client()
  if (!r2) return

  log(`Uploading to R2 bucket "${R2_BUCKET}" ...`)

  const fileStream = fs.createReadStream(outputPath)

  try {
    await r2.send(new PutObjectCommand({
      Bucket:      R2_BUCKET,
      Key:         `backups/${filename}`,
      Body:        fileStream,
      ContentType: "application/gzip",
      Metadata: {
        "backup-date": new Date().toISOString(),
        "source":      "welfare-management-system",
      },
    }))
    log(`Uploaded to R2: backups/${filename}`)
  } catch (err) {
    warn(`R2 upload failed (backup still saved locally): ${err.message}`)
  }
}

// ── Step 3: Prune old local backups ─────────────────────────────────────────
const pruneLocalBackups = () => {
  const cutoff = Date.now() - RETAIN_LOCAL * 24 * 60 * 60 * 1000
  const files  = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith(".sql.gz"))
  let deleted  = 0

  for (const file of files) {
    const filePath = path.join(BACKUP_DIR, file)
    const mtime    = fs.statSync(filePath).mtimeMs
    if (mtime < cutoff) {
      fs.unlinkSync(filePath)
      deleted++
    }
  }

  if (deleted > 0) log(`Pruned ${deleted} local backup(s) older than ${RETAIN_LOCAL} days`)
  else             log("No old local backups to prune")
}

// ── Step 4: Prune old R2 backups ────────────────────────────────────────────
const pruneR2Backups = async () => {
  const r2 = getR2Client()
  if (!r2) return

  const cutoff = new Date(Date.now() - RETAIN_R2 * 24 * 60 * 60 * 1000)

  try {
    const listed = await r2.send(new ListObjectsV2Command({
      Bucket: R2_BUCKET,
      Prefix: "backups/",
    }))

    const old = (listed.Contents || [])
      .filter(obj => new Date(obj.LastModified) < cutoff)
      .map(obj => ({ Key: obj.Key }))

    if (!old.length) {
      log(`No R2 backups older than ${RETAIN_R2} days to prune`)
      return
    }

    await r2.send(new DeleteObjectsCommand({
      Bucket: R2_BUCKET,
      Delete: { Objects: old },
    }))

    log(`Pruned ${old.length} R2 backup(s) older than ${RETAIN_R2} days`)
  } catch (err) {
    warn(`R2 pruning failed (non-fatal): ${err.message}`)
  }
}

// ── Main ──────────────────────────────────────────────────────────────────
const main = async () => {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log("  Welfare Management System — Database Backup")
  console.log(`  ${new Date().toUTCString()}`)
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")

  const { filename, outputPath } = await runPgDump()
  await uploadToR2(outputPath, filename)
  pruneLocalBackups()
  await pruneR2Backups()

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  log("Backup completed successfully 🎉")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
}

main().catch((err) => fail(err.message))
