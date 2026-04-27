import type {
    ProfileFormValues,
    ProfileFormErrors,
    PasswordFormValues,
    PasswordFormErrors,
} from "@/types/profile.types";

// ─── Constants ────────────────────────────────────────────────────────────────

export const MAX_BIO_LENGTH = 240;

export const EMPTY_PROFILE: ProfileFormValues = {
    fullName: "",
    username: "",
    email: "",
    bio: "",
    phone: "",
    location: "",
};

export const EMPTY_PASSWORD: PasswordFormValues = {
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
};

// ─── Primitive format checks ──────────────────────────────────────────────────

const isValidEmail = (value: string): boolean =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const isValidPhone = (value: string): boolean => {
    const cleaned = value.replace(/[\s\-().]/g, "");
    return /^\+?\d{7,15}$/.test(cleaned);
};

const isValidUsername = (value: string): boolean =>
    /^[a-zA-Z0-9_]{3,20}$/.test(value.trim());

// ─── Profile validators ───────────────────────────────────────────────────────

/**
 * Validates a single profile field.
 * Returns an error string if invalid, or `undefined` if valid.
 */
export const validateProfileField = (
    name: keyof ProfileFormValues,
    value: string
): string | undefined => {
    const trimmed = value.trim();

    switch (name) {
        case "fullName":
            if (!trimmed) return "Full name is required.";
            if (trimmed.length < 2) return "Full name must be at least 2 characters.";
            if (trimmed.length > 60) return "Full name must be under 60 characters.";
            return undefined;

        case "username":
            if (!trimmed) return "Username is required.";
            if (!isValidUsername(trimmed))
                return "3–20 characters. Letters, numbers, and underscores only.";
            return undefined;

        case "email":
            if (!trimmed) return "Email is required.";
            if (!isValidEmail(trimmed)) return "Enter a valid email address.";
            return undefined;

        case "phone":
            if (!trimmed) return undefined; // optional field
            if (!isValidPhone(trimmed))
                return "Enter a valid phone number (7–15 digits, optional +).";
            return undefined;

        case "bio":
            if (trimmed.length > MAX_BIO_LENGTH)
                return `Bio must be under ${MAX_BIO_LENGTH} characters.`;
            return undefined;

        case "location":
            if (trimmed.length > 80) return "Location must be under 80 characters.";
            return undefined;

        default:
            return undefined;
    }
};

/**
 * Runs `validateProfileField` across all keys and returns a map of errors.
 * An empty object means the form is valid.
 */
export const validateProfileForm = (
    values: ProfileFormValues
): ProfileFormErrors => {
    const errors: ProfileFormErrors = {};

    (Object.keys(values) as (keyof ProfileFormValues)[]).forEach((key) => {
        const error = validateProfileField(key, values[key]);
        if (error) errors[key] = error;
    });

    return errors;
};

// ─── Password validators ──────────────────────────────────────────────────────

/**
 * Validates a single password field.
 * Requires `all` to cross-validate newPassword vs currentPassword and confirmPassword.
 * Returns an error string if invalid, or `undefined` if valid.
 */
export const validatePasswordField = (
    name: keyof PasswordFormValues,
    value: string,
    all: PasswordFormValues
): string | undefined => {
    switch (name) {
        case "currentPassword":
            if (!value) return "Current password is required.";
            return undefined;

        case "newPassword":
            if (!value) return "New password is required.";
            if (value.length < 8) return "Password must be at least 8 characters.";
            if (!/[A-Z]/.test(value) || !/[a-z]/.test(value))
                return "Include both uppercase and lowercase letters.";
            if (!/\d/.test(value)) return "Include at least one number.";
            if (all.currentPassword && value === all.currentPassword)
                return "New password must be different from your current password.";
            return undefined;

        case "confirmPassword":
            if (!value) return "Please confirm your new password.";
            if (value !== all.newPassword) return "Passwords do not match.";
            return undefined;

        default:
            return undefined;
    }
};

/**
 * Runs `validatePasswordField` across all keys and returns a map of errors.
 * An empty object means the form is valid.
 */
export const validatePasswordForm = (
    values: PasswordFormValues
): PasswordFormErrors => {
    const errors: PasswordFormErrors = {};

    (Object.keys(values) as (keyof PasswordFormValues)[]).forEach((key) => {
        const error = validatePasswordField(key, values[key], values);
        if (error) errors[key] = error;
    });

    return errors;
};
