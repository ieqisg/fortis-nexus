const { spawn } = require("child_process")
const path = require("path")

const PYTHON_SCRIPT = path.resolve(__dirname, "../../app/algo/preprocess/main.py")
const PYTHON_BIN = path.resolve(__dirname, "../../app/algo/preprocess/venv/bin/python")

let isRunning = false
let lastResult = null

function runMatchingScript() {
    return new Promise((resolve, reject) => {
        if (isRunning) {
            return reject(new Error("Matching is already running"))
        }

        isRunning = true
        console.log("🔗 Spawning Python matching script...")

        const process = spawn(PYTHON_BIN, [PYTHON_SCRIPT])

        let output = ""
        let errorOutput = ""

        process.stdout.on("data", (data) => {
            const line = data.toString()
            output += line
            console.log(`[Python] ${line.trim()}`)
        })

        process.stderr.on("data", (data) => {
            const line = data.toString()
            errorOutput += line
            console.error(`[Python Error] ${line.trim()}`)
        })

        process.on("close", (code) => {
            isRunning = false

            // ── parse structured JSON log ──────────────────────
            let matchingLog = null
            try {
                const startMarker = "__MATCHING_LOG_START__"
                const endMarker = "__MATCHING_LOG_END__"
                const startIdx = output.indexOf(startMarker)
                const endIdx = output.indexOf(endMarker)
                if (startIdx !== -1 && endIdx !== -1) {
                    const jsonStr = output
                        .slice(startIdx + startMarker.length, endIdx)
                        .trim()
                    matchingLog = JSON.parse(jsonStr)
                }
            } catch (e) {
                console.error("Failed to parse matching log:", e)
            }

            if (code === 0) {
                lastResult = {
                    success: true,
                    message: matchingLog
                        ? `Matched ${matchingLog.matched} pairs${matchingLog.unmatched > 0 ? `, ${matchingLog.unmatched} unmatched` : ""}`
                        : "Matching completed successfully",
                    log: matchingLog,
                    timestamp: new Date().toISOString()
                }
                resolve(lastResult)
            } else {
                lastResult = {
                    success: false,
                    message: `Script exited with code ${code}`,
                    error: errorOutput,
                    timestamp: new Date().toISOString()
                }
                reject(lastResult)
            }
        })

        process.on("error", (err) => {
            isRunning = false
            reject({ success: false, message: err.message })
        })
    })
}

function getStatus() {
    return { isRunning, lastResult }
}

module.exports = { runMatchingScript, getStatus }
