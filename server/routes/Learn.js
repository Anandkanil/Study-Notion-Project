// Lesson notes and Q&A. Needs a login; each handler checks the caller is enrolled
// in the course (or teaches it).
const express = require("express")
const router = express.Router()
const { auth } = require("../middlewares/auth")
const L = require("../controllers/Learn")

router.use(auth)

router.get("/:courseId/notes", L.listNotes)
router.post("/:courseId/notes", L.createNote)
router.put("/notes/:id", L.updateNote)
router.delete("/notes/:id", L.deleteNote)

router.get("/:courseId/questions", L.listQuestions)
router.post("/:courseId/questions", L.askQuestion)
router.post("/questions/:id/answers", L.answerQuestion)
router.patch("/questions/:id", L.setResolved)
router.delete("/questions/:id", L.deleteQuestion)

module.exports = router
