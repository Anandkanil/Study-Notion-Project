// Admin panel API. Every route requires a logged-in Admin account.
const express = require("express")
const router = express.Router()
const { auth, isAdmin } = require("../middlewares/auth")
const A = require("../controllers/Admin")
const User = require("../models/User")

// The login token says "Admin"; also confirm it in the database, so an account
// demoted in Atlas loses access straight away instead of when its token expires.
const stillAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select("accountType").lean()
    if (user?.accountType !== "Admin") {
      return res.status(403).json({ success: false, message: "This account no longer has admin access. Log in again." })
    }
    next()
  } catch (error) {
    console.error("Admin check failed:", error.message)
    return res.status(500).json({ success: false, message: "Couldn't check admin access. Please try again." })
  }
}

router.use(auth, isAdmin, stillAdmin)

router.get("/overview", A.getOverview)

router.get("/categories", A.listCategories)
router.post("/categories", A.createCategory)
router.put("/categories/:id", A.updateCategory)
router.delete("/categories/:id", A.deleteCategory)

router.get("/courses", A.listCourses)
router.patch("/courses/:id/status", A.setCourseStatus)

router.get("/users", A.listUsers)
router.get("/users/:id", A.getUser)

router.get("/purchases", A.listPurchases)

module.exports = router
