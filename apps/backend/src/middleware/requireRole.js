function requireRole(...roles) {
  return (req, res, next) => {

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized - no user found" })
    }

    // Supports both requireRole("ADMIN") and requireRole(["ADMIN", "MEMBER"])
    const allowedRoles = roles.flat()

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Access denied. Required roles: ${allowedRoles.join(", ")}` 
      })
    }

    next()
  }
}

module.exports = requireRole