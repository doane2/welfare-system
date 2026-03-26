const { Pool } = require("pg");

const pool = new Pool({
 user: "postgres",
 password: "welfare2026",
 host: "localhost",
 port: 5432,
 database: "welfare_db"
});

module.exports = pool;