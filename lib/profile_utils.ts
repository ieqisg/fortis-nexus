import type { PasswordStrength } from "@/types/profile.types";

/**
 * Derives display initials from a full name, falling back to username.
 *
 * - Single word  → first two characters uppercased  ("john" → "JO")
 * - Multi word   → first char of first + last word   ("John Doe" → "JD")
 * - Empty        → "?"
 */
export const getInitials = (name: string, username: string): string => {
    const source = name.trim() || username.trim();
    if (!source) return "?";

    const parts = source.split(/\s+/).filter(Boolean);

    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase();
    }

    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/**
 * Scores a password string on a 1–5 scale and returns a human-readable label
 * plus a Tailwind background-color class for the strength meter.
 *
 * Scoring criteria (each adds 1 point):
 *  1. Length ≥ 8
 *  2. Length ≥ 12
 *  3. Mixed case (upper + lower)
 *  4. Contains a digit
 *  5. Contains a special character
 */
export const getPasswordStrength = (value: string): PasswordStrength => {
    if (!value) return { score: 0, label: "", color: "bg-slate-200" };

    let score = 0;
    if (value.length >= 8) score += 1;
    if (value.length >= 12) score += 1;
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
    if (/\d/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value)) score += 1;

    if (score <= 1) return { score: 1, label: "Weak", color: "bg-red-500" };
    if (score <= 3) return { score: 3, label: "Fair", color: "bg-amber-500" };
    if (score === 4) return { score: 4, label: "Good", color: "bg-blue-500" };
    return { score: 5, label: "Strong", color: "bg-emerald-500" };
};
