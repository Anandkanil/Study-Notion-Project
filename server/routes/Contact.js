const express = require("express")
const router = express.Router()
const { contactUsController } = require("../controllers/ContactUs")
const { rateLimit } = require("../middlewares/rateLimit")

// Each message sends emails, so keep it to a handful per hour per address
const contactLimit = rateLimit({ name: "contact-ip", windowMs: 60 * 60 * 1000, max: 5,
  message: "You've sent several messages already. Please wait an hour, or email us directly." })

router.post("/contact", contactLimit, contactUsController)

module.exports = router
