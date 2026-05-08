import { describe, it, expect } from "vitest"
import { getInitials, getPasswordStrength } from "@/lib/profile_utils"

// ─── getInitials ──────────────────────────────────────────────────────────────

describe("getInitials", () => {
    it("returns first two chars uppercased for a single word name", () => {
        expect(getInitials("john", "")).toBe("JO")
    })

    it("returns first char of first + last word for multi-word name", () => {
        expect(getInitials("John Doe", "")).toBe("JD")
        expect(getInitials("Mary Jane Watson", "")).toBe("MW")
    })

    it("falls back to username when name is empty", () => {
        expect(getInitials("", "marc123")).toBe("MA")
    })

    it("falls back to username when name is only whitespace", () => {
        expect(getInitials("   ", "marc123")).toBe("MA")
    })

    it("returns '?' when both name and username are empty", () => {
        expect(getInitials("", "")).toBe("?")
        expect(getInitials("  ", "  ")).toBe("?")
    })

    it("handles a two-word username fallback", () => {
        expect(getInitials("", "john doe")).toBe("JD")
    })

    it("uppercases the result", () => {
        expect(getInitials("alice", "")).toBe("AL")
        expect(getInitials("alice bob", "")).toBe("AB")
    })
})

// ─── getPasswordStrength ──────────────────────────────────────────────────────

describe("getPasswordStrength", () => {
    it("returns score 0 for empty string", () => {
        const result = getPasswordStrength("")
        expect(result.score).toBe(0)
        expect(result.label).toBe("")
        expect(result.color).toBe("bg-slate-200")
    })

    it("returns Weak for short lowercase-only passwords", () => {
        const result = getPasswordStrength("abc")
        expect(result.score).toBe(1)
        expect(result.label).toBe("Weak")
        expect(result.color).toBe("bg-red-500")
    })

    it("returns Weak for a password >= 8 chars but nothing else", () => {
        // length ≥ 8 gives score 1 → still Weak (score ≤ 1)
        const result = getPasswordStrength("abcdefgh")
        expect(result.score).toBe(1)
        expect(result.label).toBe("Weak")
    })

    it("returns Fair for password with length + mixed case", () => {
        // ≥8 chars (1) + mixed case (1) = score 2 → Fair (≤3)
        const result = getPasswordStrength("Abcdefgh")
        expect(result.score).toBe(3)
        expect(result.label).toBe("Fair")
        expect(result.color).toBe("bg-amber-500")
    })

    it("returns Fair for password with length + mixed case + digit", () => {
        // ≥8 (1) + mixed case (1) + digit (1) = score 3 → Fair
        const result = getPasswordStrength("Abcdefg1")
        expect(result.score).toBe(3)
        expect(result.label).toBe("Fair")
    })

    it("returns Good for password scoring 4", () => {
        // ≥8 (1) + ≥12 (1) + mixed case (1) + digit (1) = score 4
        const result = getPasswordStrength("Abcdefghijk1")
        expect(result.score).toBe(4)
        expect(result.label).toBe("Good")
        expect(result.color).toBe("bg-blue-500")
    })

    it("returns Strong for password scoring 5", () => {
        // ≥8 (1) + ≥12 (1) + mixed case (1) + digit (1) + special (1) = 5
        const result = getPasswordStrength("Abcdefghijk1!")
        expect(result.score).toBe(5)
        expect(result.label).toBe("Strong")
        expect(result.color).toBe("bg-emerald-500")
    })

    it("recognises various special characters", () => {
        expect(getPasswordStrength("Abcdefghijk1@").label).toBe("Strong")
        expect(getPasswordStrength("Abcdefghijk1#").label).toBe("Strong")
        expect(getPasswordStrength("Abcdefghijk1$").label).toBe("Strong")
    })
})
