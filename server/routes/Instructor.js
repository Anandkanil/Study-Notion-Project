// Instructor tools for their own courses. Every route needs an Instructor login;
// each handler also checks the course belongs to the caller.
const express = require("express")
const router = express.Router()
const { auth, isInstructor } = require("../middlewares/auth")
const I = require("../controllers/Instructor")

router.use(auth, isInstructor)

router.get("/courses/:courseId/stats", I.getCourseStats)

router.get("/courses/:courseId/reviews", I.listReviews)
router.put("/reviews/:reviewId/reply", I.replyToReview)
router.delete("/reviews/:reviewId/reply", I.deleteReply)

router.get("/courses/:courseId/announcements", I.listAnnouncementsForInstructor)
router.post("/courses/:courseId/announcements", I.createAnnouncement)
router.delete("/announcements/:id", I.deleteAnnouncement)

router.get("/courses/:courseId/coupons", I.listCoupons)
router.post("/courses/:courseId/coupons", I.createCoupon)
router.patch("/coupons/:id", I.setCouponActive)

module.exports = router
