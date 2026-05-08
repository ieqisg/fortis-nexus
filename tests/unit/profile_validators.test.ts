import { describe, it, expect } from "vitest"
import {
    validateProfileField,
    validateProfileForm,
    validatePasswordField,
    validatePasswordForm,
    MAX_BIO_LENGTH,
    EMPTY_PROFILE,
    EMPTY_PASSWORD,
} from "@/lib/profile_validators"

// ─── validateProfileField ─────────────────────────────────────────────────────

describe("validateProfileField — fullName", () => {
    it("returns error for empty name", () => {
        expect(validateProfileField("fullName", "")).toBeTruthy()
    })

    it("returns error for whitespace-only name", () => {
        expect(validateProfileField("fullName", "   ")).toBeTruthy()
    })

    it("returns error for single character", () => {
        expect(validateProfileField("fullName", "A")).toBeTruthy()
    })

    it("returns error for name over 60 chars", () => {
        expect(validateProfileField("fullName", "A".repeat(61))).toBeTruthy()
    })

    it("accepts a normal name", () => {
        expect(validateProfileField("fullName", "John Doe")).toBeUndefined()
    })

    it("accepts exactly 2 characters", () => {
        expect(validateProfileField("fullName", "Jo")).toBeUndefined()
    })
})

describe("validateProfileField — username", () => {
    it("returns error for empty username", () => {
        expect(validateProfileField("username", "")).toBeTruthy()
    })

    it("returns error for username shorter than 3 chars", () => {
        expect(validateProfileField("username", "ab")).toBeTruthy()
    })

    it("returns error for username longer than 20 chars", () => {
        expect(validateProfileField("username", "a".repeat(21))).toBeTruthy()
    })

    it("returns error for username with spaces", () => {
        expect(validateProfileField("username", "john doe")).toBeTruthy()
    })

    it("returns error for username with special chars (not underscore)", () => {
        expect(validateProfileField("username", "john-doe")).toBeTruthy()
        expect(validateProfileField("username", "john.doe")).toBeTruthy()
    })

    it("accepts valid username with letters, numbers, underscore", () => {
        expect(validateProfileField("username", "john_123")).toBeUndefined()
    })

    it("accepts exactly 3 chars", () => {
        expect(validateProfileField("username", "abc")).toBeUndefined()
    })

    it("accepts exactly 20 chars", () => {
        expect(validateProfileField("username", "a".repeat(20))).toBeUndefined()
    })
})

describe("validateProfileField — email", () => {
    it("returns error for empty email", () => {
        expect(validateProfileField("email", "")).toBeTruthy()
    })

    it("returns error for email without @", () => {
        expect(validateProfileField("email", "notanemail")).toBeTruthy()
    })

    it("returns error for email without domain", () => {
        expect(validateProfileField("email", "user@")).toBeTruthy()
    })

    it("accepts a valid email", () => {
        expect(validateProfileField("email", "user@example.com")).toBeUndefined()
    })

    it("trims whitespace before checking", () => {
        expect(validateProfileField("email", "  user@example.com  ")).toBeUndefined()
    })
})

describe("validateProfileField — phone (optional)", () => {
    it("returns undefined for empty phone (optional)", () => {
        expect(validateProfileField("phone", "")).toBeUndefined()
    })

    it("returns error for phone too short", () => {
        expect(validateProfileField("phone", "123")).toBeTruthy()
    })

    it("accepts phone with country code", () => {
        expect(validateProfileField("phone", "+639123456789")).toBeUndefined()
    })

    it("accepts phone with spaces and dashes (stripped)", () => {
        expect(validateProfileField("phone", "0912 345-6789")).toBeUndefined()
    })
})

describe("validateProfileField — bio", () => {
    it("accepts empty bio", () => {
        expect(validateProfileField("bio", "")).toBeUndefined()
    })

    it("accepts bio at exactly MAX_BIO_LENGTH", () => {
        expect(validateProfileField("bio", "a".repeat(MAX_BIO_LENGTH))).toBeUndefined()
    })

    it("returns error for bio over MAX_BIO_LENGTH", () => {
        expect(validateProfileField("bio", "a".repeat(MAX_BIO_LENGTH + 1))).toBeTruthy()
    })
})

describe("validateProfileField — location", () => {
    it("accepts empty location", () => {
        expect(validateProfileField("location", "")).toBeUndefined()
    })

    it("accepts location under 80 chars", () => {
        expect(validateProfileField("location", "Makati City, Philippines")).toBeUndefined()
    })

    it("returns error for location over 80 chars", () => {
        expect(validateProfileField("location", "a".repeat(81))).toBeTruthy()
    })
})

// ─── validateProfileForm ──────────────────────────────────────────────────────

describe("validateProfileForm", () => {
    it("returns errors for every required field when given EMPTY_PROFILE", () => {
        const errors = validateProfileForm(EMPTY_PROFILE)
        expect(errors.fullName).toBeTruthy()
        expect(errors.username).toBeTruthy()
        expect(errors.email).toBeTruthy()
    })

    it("returns no errors for a fully valid profile", () => {
        const errors = validateProfileForm({
            fullName: "Jane Doe",
            username: "jane_doe",
            email: "jane@example.com",
            bio: "",
            phone: "",
            location: "",
        })
        expect(Object.keys(errors)).toHaveLength(0)
    })

    it("collects multiple errors at once", () => {
        const errors = validateProfileForm({
            fullName: "",
            username: "x",
            email: "bademail",
            bio: "",
            phone: "",
            location: "",
        })
        expect(errors.fullName).toBeTruthy()
        expect(errors.username).toBeTruthy()
        expect(errors.email).toBeTruthy()
    })
})

// ─── validatePasswordField ────────────────────────────────────────────────────

const basePass = { currentPassword: "Old@Pass1", newPassword: "New@Pass1", confirmPassword: "New@Pass1" }

describe("validatePasswordField — currentPassword", () => {
    it("returns error when current password is empty", () => {
        expect(validatePasswordField("currentPassword", "", basePass)).toBeTruthy()
    })

    it("accepts non-empty current password", () => {
        expect(validatePasswordField("currentPassword", "anything", basePass)).toBeUndefined()
    })
})

describe("validatePasswordField — newPassword", () => {
    it("returns error when empty", () => {
        expect(validatePasswordField("newPassword", "", basePass)).toBeTruthy()
    })

    it("returns error when shorter than 8 chars", () => {
        expect(validatePasswordField("newPassword", "Ab1!", basePass)).toBeTruthy()
    })

    it("returns error when all lowercase (no uppercase)", () => {
        expect(validatePasswordField("newPassword", "abcdefg1", basePass)).toBeTruthy()
    })

    it("returns error when no digit", () => {
        expect(validatePasswordField("newPassword", "Abcdefgh", basePass)).toBeTruthy()
    })

    it("returns error when same as current password", () => {
        const vals = { ...basePass, currentPassword: "Same@Pass1", newPassword: "Same@Pass1" }
        expect(validatePasswordField("newPassword", "Same@Pass1", vals)).toBeTruthy()
    })

    it("accepts a valid new password", () => {
        const vals = { ...basePass, currentPassword: "Old@Pass1", newPassword: "Valid1Pass" }
        expect(validatePasswordField("newPassword", "Valid1Pass", vals)).toBeUndefined()
    })
})

describe("validatePasswordField — confirmPassword", () => {
    it("returns error when empty", () => {
        expect(validatePasswordField("confirmPassword", "", basePass)).toBeTruthy()
    })

    it("returns error when it does not match newPassword", () => {
        const vals = { ...basePass, newPassword: "New@Pass1", confirmPassword: "Different1" }
        expect(validatePasswordField("confirmPassword", "Different1", vals)).toBeTruthy()
    })

    it("accepts confirm that matches newPassword", () => {
        expect(validatePasswordField("confirmPassword", "New@Pass1", basePass)).toBeUndefined()
    })
})

// ─── validatePasswordForm ─────────────────────────────────────────────────────

describe("validatePasswordForm", () => {
    it("returns errors for all fields on EMPTY_PASSWORD", () => {
        const errors = validatePasswordForm(EMPTY_PASSWORD)
        expect(errors.currentPassword).toBeTruthy()
        expect(errors.newPassword).toBeTruthy()
        expect(errors.confirmPassword).toBeTruthy()
    })

    it("returns no errors for a valid password change", () => {
        const errors = validatePasswordForm({
            currentPassword: "OldPass1",
            newPassword: "NewPass1",
            confirmPassword: "NewPass1",
        })
        expect(Object.keys(errors)).toHaveLength(0)
    })

    it("catches mismatch between new and confirm", () => {
        const errors = validatePasswordForm({
            currentPassword: "OldPass1",
            newPassword: "NewPass1",
            confirmPassword: "WrongPass1",
        })
        expect(errors.confirmPassword).toBeTruthy()
    })
})
