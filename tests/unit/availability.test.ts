import { describe, it, expect } from "vitest"
import { parseSlot, encodeSlot } from "@/components/ui/AvailabilitySelector"

// ─── encodeSlot ───────────────────────────────────────────────────────────────

describe("encodeSlot", () => {
    it("encodes day and slot with a colon separator", () => {
        expect(encodeSlot("Monday", "7:00-8:00")).toBe("Monday:7:00-8:00")
    })

    it("works for any day name", () => {
        expect(encodeSlot("Friday", "14:00-15:00")).toBe("Friday:14:00-15:00")
    })

    it("handles slot strings that already contain colons", () => {
        // slot = "7:00-8:00" contains colons — encode still joins with one colon
        expect(encodeSlot("Wednesday", "7:00-8:00")).toBe("Wednesday:7:00-8:00")
    })
})

// ─── parseSlot ────────────────────────────────────────────────────────────────

describe("parseSlot", () => {
    it("parses day and slot from encoded string", () => {
        const { day, slot } = parseSlot("Monday:7:00-8:00")
        expect(day).toBe("Monday")
        expect(slot).toBe("7:00-8:00")
    })

    it("handles afternoon slots", () => {
        const { day, slot } = parseSlot("Friday:14:00-15:00")
        expect(day).toBe("Friday")
        expect(slot).toBe("14:00-15:00")
    })

    it("handles all days of the week", () => {
        const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        for (const d of days) {
            const encoded = encodeSlot(d, "9:00-10:00")
            expect(parseSlot(encoded).day).toBe(d)
        }
    })
})

// ─── round-trip: encode → parse ───────────────────────────────────────────────

describe("encodeSlot / parseSlot round-trip", () => {
    it("recovers original day and slot after encode then parse", () => {
        const day = "Thursday"
        const slot = "10:00-11:00"
        const { day: d, slot: s } = parseSlot(encodeSlot(day, slot))
        expect(d).toBe(day)
        expect(s).toBe(slot)
    })

    it("round-trips multiple unique slots without collision", () => {
        const pairs = [
            { day: "Monday", slot: "7:00-8:00" },
            { day: "Monday", slot: "9:00-10:00" },
            { day: "Tuesday", slot: "7:00-8:00" },
        ]
        const encoded = pairs.map(p => encodeSlot(p.day, p.slot))
        // All encoded values must be unique
        expect(new Set(encoded).size).toBe(pairs.length)

        encoded.forEach((enc, i) => {
            const { day, slot } = parseSlot(enc)
            expect(day).toBe(pairs[i].day)
            expect(slot).toBe(pairs[i].slot)
        })
    })
})
