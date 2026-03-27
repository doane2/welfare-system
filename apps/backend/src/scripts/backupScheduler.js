/**
 * ─────────────────────────────────────────────────────────────────────────────
 * In-process cron scheduler for automated backups.
 * Import this in server.js if you prefer not to use an external cron job.
 *
 * Setup:
 *   npm install node-cron
 *
 * Usage in server.js:
 *   require("./scripts/backupScheduler")   // add this one line
 *
 * Schedule reference:
 *   "0 2 * * *"   → 02:00 every day        (recommended)
 *   "0 2 * * 0"   → 02:00 every Sunday     (weekly)
 *   "0 2 1 * *"   → 02:00 on 1st of month  (monthly)
 * ─────────────────────────────────────────────────────────────────────────────
 */

const cron = require("node-cron")
const path = require("path")
const { execFile } = require("child_process")

const BACKUP_SCHEDULE = process.env.BACKUP_CRON_SCHEDULE || "0 2 * * *"
const BACKUP_SCRIPT   = path.join(__dirname, "backup.js")

const runBackup = () => {
  console.log(`[${new Date().toISOString()}] 🕐 Running scheduled backup...`)

  execFile("node", [BACKUP_SCRIPT], (error, stdout, stderr) => {
    if (stdout) process.stdout.write(stdout)
    if (stderr) process.stderr.write(stderr)

    if (error) {
      console.error(`[${new Date().toISOString()}] ❌ Scheduled backup FAILED:`, error.message)
    } else {
      console.log(`[${new Date().toISOString()}] ✅ Scheduled backup completed`)
    }
  })
}

// Validate cron expression before registering
if (!cron.validate(BACKUP_SCHEDULE)) {
  console.error(`❌ Invalid BACKUP_CRON_SCHEDULE: "${BACKUP_SCHEDULE}" — backup scheduler NOT started`)
} else {
  cron.schedule(BACKUP_SCHEDULE, runBackup, {
    scheduled: true,
    timezone:  "Africa/Nairobi",   // EAT — change if needed
  })

  console.log(`✅ Backup scheduler registered — runs: ${BACKUP_SCHEDULE} (Africa/Nairobi)`)
}

module.exports = { runBackup }
