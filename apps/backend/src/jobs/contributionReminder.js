/**
 * Contribution Due Reminder — Email + SMS
 * ─────────────────────────────────────────
 * Run daily via cron job or task scheduler.
 * Finds unpaid contributions due in the next 3 days
 * and notifies each member via email AND SMS.
 *
 * Manual run:
 *   node src/jobs/contributionReminder.js
 *
 * Cron (runs every day at 8:00 AM):
 *   0 8 * * * node /path/to/apps/backend/src/jobs/contributionReminder.js
 *
 * package.json script:
 *   "reminder": "node src/jobs/contributionReminder.js"
 */

require("dotenv").config()
const prisma = require("../lib/prisma")
const { sendContributionReminderEmail } = require("../services/emailService")
const { sendContributionReminderSMS }   = require("../services/smsService")

const DAYS_BEFORE_DUE = 3

const runReminders = async () => {
  console.log("⏰ Running contribution due reminders — email + SMS...")

  const today        = new Date()
  const reminderDate = new Date()
  reminderDate.setDate(today.getDate() + DAYS_BEFORE_DUE)

  try {
    const dueContributions = await prisma.contribution.findMany({
      where: {
        paid: false,
        status: "PENDING",
        dueDate: {
          gte: today,
          lte: reminderDate
        }
      },
      include: {
        user: {
          select: {
            email: true,
            phone: true,
            fullName: true,
            isActive: true
          }
        }
      }
    })

    if (dueContributions.length === 0) {
      console.log("✅ No contributions due in the next 3 days.")
      return
    }

    console.log(`📋 Found ${dueContributions.length} contribution(s) due soon.`)

    // Only notify active members
    const active = dueContributions.filter((c) => c.user.isActive)

    const results = await Promise.allSettled(
      active.flatMap((contribution) => {
        const notifyData = {
          fullName : contribution.user.fullName,
          amount   : contribution.amount,
          type     : contribution.type,
          period   : contribution.period,
          dueDate  : contribution.dueDate
        }
        return [
          sendContributionReminderEmail({ email: contribution.user.email, ...notifyData }),
          sendContributionReminderSMS({ phone: contribution.user.phone, ...notifyData })
        ]
      })
    )

    const sent   = results.filter((r) => r.status === "fulfilled").length
    const failed = results.filter((r) => r.status === "rejected").length

    console.log(`✅ Reminders sent: ${sent} succeeded, ${failed} failed`)

  } catch (error) {
    console.error("❌ Contribution reminder job failed:", error.message)
  } finally {
    await prisma.$disconnect()
    console.log("🔌 Database disconnected")
  }
}

runReminders()
