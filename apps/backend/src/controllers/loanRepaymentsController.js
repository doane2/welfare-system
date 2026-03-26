const prisma = require("../lib/prisma")

// GET ALL REPAYMENTS (with filters)
exports.getRepayments = async (req, res) => {
  try {
    const { page = 1, limit = 10, loanId, userId } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)

    // If member, only show their own repayments
    let whereClause = {}

    if (req.user.role === "MEMBER") {
      // Find loans belonging to this member first
      const memberLoans = await prisma.loan.findMany({
        where: { userId: req.user.id },
        select: { id: true }
      })
      const loanIds = memberLoans.map((l) => l.id)
      whereClause = { loanId: { in: loanIds } }
    } else {
      if (loanId) whereClause.loanId = loanId
      if (userId) {
        const userLoans = await prisma.loan.findMany({
          where: { userId },
          select: { id: true }
        })
        whereClause.loanId = { in: userLoans.map((l) => l.id) }
      }
    }

    const [repayments, total] = await Promise.all([
      prisma.loanRepayment.findMany({
        where: whereClause,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: "desc" },
        include: {
          loan: {
            select: {
              id: true,
              principal: true,
              interestRate: true,
              status: true,
              user: { select: { id: true, fullName: true, memberNumber: true } }
            }
          }
        }
      }),
      prisma.loanRepayment.count({ where: whereClause })
    ])

    res.json({
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      repayments
    })

  } catch (error) {
    console.error("❌ getRepayments error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// GET REPAYMENTS FOR A SPECIFIC LOAN
exports.getRepaymentsByLoan = async (req, res) => {
  try {
    const { loanId } = req.params

    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        user: { select: { id: true, fullName: true, memberNumber: true } },
        repayments: { orderBy: { createdAt: "asc" } }
      }
    })

    if (!loan) {
      return res.status(404).json({ message: "Loan not found" })
    }

    // Members can only view their own loan repayments
    if (req.user.role === "MEMBER" && loan.userId !== req.user.id) {
      return res.status(403).json({ message: "Access denied" })
    }

    const totalDue      = loan.principal + loan.principal * loan.interestRate
    const totalRepaid   = loan.repayments.reduce((sum, r) => sum + r.amount, 0)
    const totalPending  = Math.max(0, totalDue - totalRepaid)

    res.json({
      loan: {
        id: loan.id,
        principal: loan.principal,
        interestRate: loan.interestRate,
        totalDue: parseFloat(totalDue.toFixed(2)),
        status: loan.status,
        member: loan.user
      },
      summary: {
        totalRepaid: parseFloat(totalRepaid.toFixed(2)),
        totalPending: parseFloat(totalPending.toFixed(2)),
        repaymentCount: loan.repayments.length
      },
      repayments: loan.repayments
    })

  } catch (error) {
    console.error("❌ getRepaymentsByLoan error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// GET SINGLE REPAYMENT
exports.getRepaymentById = async (req, res) => {
  try {
    const { id } = req.params

    const repayment = await prisma.loanRepayment.findUnique({
      where: { id },
      include: {
        loan: {
          select: {
            id: true,
            principal: true,
            interestRate: true,
            status: true,
            userId: true,
            user: { select: { id: true, fullName: true, memberNumber: true } }
          }
        }
      }
    })

    if (!repayment) {
      return res.status(404).json({ message: "Repayment not found" })
    }

    // Members can only view their own
    if (req.user.role === "MEMBER" && repayment.loan.userId !== req.user.id) {
      return res.status(403).json({ message: "Access denied" })
    }

    res.json({ repayment })

  } catch (error) {
    console.error("❌ getRepaymentById error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

// DELETE REPAYMENT (super admin only — for corrections)
exports.deleteRepayment = async (req, res) => {
  try {
    const { id } = req.params

    const repayment = await prisma.loanRepayment.findUnique({
      where: { id },
      include: { loan: true }
    })

    if (!repayment) {
      return res.status(404).json({ message: "Repayment not found" })
    }

    await prisma.loanRepayment.delete({ where: { id } })

    // If loan was marked PAID, revert to APPROVED since repayment was deleted
    if (repayment.loan.status === "PAID") {
      await prisma.loan.update({
        where: { id: repayment.loanId },
        data: { status: "APPROVED" }
      })
    }

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        action: "DELETE_LOAN_REPAYMENT",
        entity: "LoanRepayment",
        entityId: id,
        userId: req.user.id
      }
    }).catch((e) => console.error("⚠️ Audit log failed:", e.message))

    console.log("✅ Repayment deleted:", id)

    res.json({ message: "Repayment deleted successfully" })

  } catch (error) {
    console.error("❌ deleteRepayment error:", error.message)
    res.status(500).json({ error: error.message })
  }
}
