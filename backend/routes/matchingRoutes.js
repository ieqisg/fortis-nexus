const express = require("express")
const router = express.Router()
const matchingController = require("../controller/matchingController")

router.post("/run", matchingController.runMatching)
router.get("/status", matchingController.getStatus)

module.exports = router
