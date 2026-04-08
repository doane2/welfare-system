// config/db.js
// Pool is managed by lib/prisma.js via @prisma/adapter-pg
// Import prisma directly for raw queries instead of this pool
const prisma = require("../lib/prisma");
module.exports = prisma;