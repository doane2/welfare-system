const { Pool } = require("pg");

// Railway provides the DATABASE_URL automatically if linked, 
// or you can paste the 'Internal Database URL' into your Backend variables.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Railway's secure connection
  }
});

// Test connection immediately on start
pool.connect((err, client, release) => {
  if (err) {
    return console.error("❌ Database connection error:", err.stack);
  }
  console.log("✅ Database connected successfully");
  release();
});

module.exports = pool;