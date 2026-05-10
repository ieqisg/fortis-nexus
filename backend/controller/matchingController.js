const matchingService = require("../services/matchingService")

async function runMatching(req, res) {
    try {
        const mode = req.body?.mode ?? "fair-matching"
        const result = await matchingService.runMatchingScript(mode)
        return res.status(200).json(result)
    } catch (error) {
        // if already running
        if (error.message === "Matching is already running") {
            return res.status(409).json({
                success: false,
                message: "Matching algorithm is already running, please wait"
            })
        }
        return res.status(500).json({
            success: false,
            message: error.message || "Matching failed",
            error: error.error
        })
    }
}

function getStatus(req, res) {
    const status = matchingService.getStatus()
    return res.status(200).json({
        success: true,
        ...status
    })
}

module.exports = { runMatching, getStatus }
