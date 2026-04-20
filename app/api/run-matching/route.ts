import { NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000"

export async function POST() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/matching/run`, {
            method: "POST",
        })
        const data = await response.json()
        return NextResponse.json(data)
    } catch (error) {
        return NextResponse.json(
            { success: false, message: "Failed to connect to matching server" },
            { status: 500 }
        )
    }
}

export async function GET() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/matching/status`)
        const data = await response.json()
        return NextResponse.json(data)
    } catch (error) {
        return NextResponse.json(
            { success: false, message: "Failed to connect to matching server" },
            { status: 500 }
        )
    }
}
