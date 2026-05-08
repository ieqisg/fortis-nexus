const express = require("express")
const cors = require("cors")
const matchingRoutes = require("./routes/matchingRoutes")
require("dotenv").config()

const app = express()

const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim())
    : ["http://localhost:3000"]

app.use(cors({
    origin: (origin, callback) => {
        // allow server-to-server calls (no origin) and listed origins
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true)
        } else {
            callback(new Error(`CORS: origin ${origin} not allowed`))
        }
    },
}))
app.use(express.json())

app.use("/api/matching", matchingRoutes)

app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() })
})

module.exports = app
