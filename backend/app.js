const express = require("express")
const cors = require("cors")
const matchingRoutes = require("./routes/matchingRoutes")
require("dotenv").config()

const app = express()

app.use(cors())
app.use(express.json())

app.use("/api/matching", matchingRoutes)

app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() })
})

module.exports = app
