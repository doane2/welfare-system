const prisma = require("../lib/prisma")
const bcrypt = require("bcrypt")

exports.activateAccount = async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body

    // Validate required fields
    if (!token || !password || !confirmPassword) {
      return res.status(400).json({ 
        message: "Token, password and confirmPassword are required" 
      })
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" })
    }

    if (password.length < 8) {
      return res.status(400).json({ 
        message: "Password must be at least 8 characters" 
      })
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ 
        message: "Password must contain at least one uppercase letter, one lowercase letter, and one number" 
      })
    }

    // Find user by activation token
    const user = await prisma.user.findFirst({
      where: { activationToken: token }
    })

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired activation token" })
    }

    // Check if already activated
    if (user.isActive) {
      return res.status(400).json({ 
        message: "Account already activated. Please log in." 
      })
    }

    // Hash password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Update user: set password, mark active, clear token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        isActive: true,
        activationToken: null
      }
    })

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        action: "ACTIVATE_ACCOUNT",
        entity: "User",
        entityId: user.id,
        userId: user.id
      }
    }).catch((auditError) => {
      console.error("⚠️ Audit log failed:", auditError.message)
    })

    console.log(`✅ Account activated for: ${user.email}`)

    res.json({ message: "Account activated successfully. You can now log in." })

  } catch (error) {
    console.error("❌ Activate account error:", error.message)
    res.status(500).json({ error: error.message })
  }
}