const { spawn } = require("child_process")
const path = require("path")

// ── use absolute path from project root ──
const PROJECT_ROOT = path.resolve(__dirname, "../..")
const PYTHON_SCRIPT = path.join(PROJECT_ROOT, "app/algo/preprocess/main.py")
const PYTHON_BIN = path.join(PROJECT_ROOT, "app/algo/venv/bin/python3") // ← fixed path

let isRunning = false
let lastResult = null

function runMatchingScript(mode = "fair-matching") {
    return new Promise((resolve, reject) => {
        if (isRunning) {
            return reject(new Error("Matching is already running"))
        }
        isRunning = true

        // verify paths exist before spawning
        const fs = require("fs")
        if (!fs.existsSync(PYTHON_BIN)) {
            isRunning = false
            return reject({ success: false, message: `Python binary not found: ${PYTHON_BIN}` })
        }
        if (!fs.existsSync(PYTHON_SCRIPT)) {
            isRunning = false
            return reject({ success: false, message: `Script not found: ${PYTHON_SCRIPT}` })
        }

        console.log("🔗 Spawning Python matching script...")
        console.log("  Binary:", PYTHON_BIN)
        console.log("  Script:", PYTHON_SCRIPT)
        console.log("  Mode:  ", mode)

        const proc = spawn(PYTHON_BIN, [PYTHON_SCRIPT, "--mode", mode], {
            cwd: path.join(PROJECT_ROOT, "app/algo/preprocess"), // ← set working dir so imports work
            env: { ...process.env }
        })

        let output = ""
        let errorOutput = ""

        proc.stdout.on("data", (data) => {
            const line = data.toString()
            output += line
            console.log(`[Python] ${line.trim()}`)
        })

        proc.stderr.on("data", (data) => {
            const line = data.toString()
            errorOutput += line
            console.error(`[Python Error] ${line.trim()}`)
        })

        proc.on("close", (code) => {
            isRunning = false

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

        proc.on("error", (err) => {
            isRunning = false
            reject({ success: false, message: err.message })
        })
    })
}

function getStatus() {
    return { isRunning, lastResult }
}

module.exports = { runMatchingScript, getStatus }
