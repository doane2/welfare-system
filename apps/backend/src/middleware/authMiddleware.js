const jwt = require("jsonwebtoken")

function authenticateToken(req, res, next) {

  // Guard against missing JWT_SECRET in env
  if (!process.env.JWT_SECRET) {
    console.error("❌ JWT_SECRET is not defined in environment variables")
    return res.status(500).json({ message: "Server configuration error" })
  }

  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  // Check token format — must be "Bearer <token>"
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authorization header must be in format: Bearer <token>" })
  }

  if (!token) {
    return res.status(401).json({ message: "Token required" })
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {

    if (err) {
      // Distinguish between expired and invalid tokens
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ 
          message: "Token has expired. Please log in again.",
          expired: true
        })
      }

      if (err.name === "JsonWebTokenError") {
        return res.status(403).json({ 
          message: "Invalid token. Please log in again." 
        })
      }

      if (err.name === "NotBeforeError") {
        return res.status(403).json({ 
          message: "Token not yet valid." 
        })
      }

      // Fallback for any other JWT errors
      return res.status(403).json({ message: "Token verification failed" })
    }

    // Guard against malformed JWT payload missing id or role
    if (!user || !user.id || !user.role) {
      return res.status(403).json({ message: "Invalid token payload" })
    }

    req.user = user
    next()
  })
}

module.exports = authenticateToken