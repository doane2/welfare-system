// Admin invitation emails go through the shared email service (verified sender domain).
const { sendAdminInviteEmail } = require("./emailService")
module.exports = { sendAdminInviteEmail }
