import type { getMenteeData } from "@/lib/actions/menteeActions"
import { getMentorData } from "@/lib/actions/mentorActions";

export type MenteeData = Awaited<ReturnType<typeof getMenteeData>>["data"]
export type MentorData = Awaited<ReturnType<typeof getMentorData>>["data"]







// ─── Profile Form ─────────────────────────────────────────────────────────────

export type ProfileFormValues = {
    fullName: string;
    username: string;
    email: string;
    bio: string;
    phone: string;
    location: string;
};

/** Maps every ProfileFormValues key to an optional validation error string. */
export type ProfileFormErrors = Partial<Record<keyof ProfileFormValues, string>>;

/** Tracks which profile fields the user has interacted with (for deferred validation). */
export type ProfileTouchedFields = Partial<Record<keyof ProfileFormValues, boolean>>;

// ─── Password Form ────────────────────────────────────────────────────────────

export type PasswordFormValues = {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
};

/** Maps every PasswordFormValues key to an optional validation error string. */
export type PasswordFormErrors = Partial<Record<keyof PasswordFormValues, string>>;

/** Tracks which password fields the user has interacted with (for deferred validation). */
export type PasswordTouchedFields = Partial<Record<keyof PasswordFormValues, boolean>>;

// ─── Password Strength ────────────────────────────────────────────────────────

export type PasswordStrength = {
    /** Numeric score 1–5. */
    score: number;
    /** Human-readable label e.g. "Weak" | "Fair" | "Good" | "Strong". */
    label: string;
    /** Tailwind bg-color class for the strength meter segments. */
    color: string;
};
