"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import type {
    UserDataProps,
    ProfileFormValues,
    ProfileFormErrors,
    ProfileTouchedFields,
    PasswordFormValues,
    PasswordFormErrors,
    PasswordTouchedFields,
} from "@/types/profile_types";



import {
    EMPTY_PROFILE,
    EMPTY_PASSWORD,
    MAX_BIO_LENGTH,
    validateProfileField,
    validateProfileForm,
    validatePasswordField,
    validatePasswordForm,
} from "@/lib/profile_validators";

import { getInitials, getPasswordStrength } from "@/lib/profile_utils";
import Sidebar from "@/components/ui/Sidebar";

// ─── Component ────────────────────────────────────────────────────────────────

export default function MenteeProfileDetails({ menteeData }: UserDataProps) {
    const { group_name } = menteeData

    // ── Profile form state ──────────────────────────────────────────────────────
    const [initialValues, setInitialValues] = useState<ProfileFormValues>(EMPTY_PROFILE);
    const [values, setValues] = useState<ProfileFormValues>(EMPTY_PROFILE);
    const [errors, setErrors] = useState<ProfileFormErrors>({});
    const [touched, setTouched] = useState<ProfileTouchedFields>({});
    const [isSaving, setIsSaving] = useState(false);

    // ── Password form state ─────────────────────────────────────────────────────
    const [passwordValues, setPasswordValues] = useState<PasswordFormValues>(EMPTY_PASSWORD);
    const [passwordErrors, setPasswordErrors] = useState<PasswordFormErrors>({});
    const [passwordTouched, setPasswordTouched] = useState<PasswordTouchedFields>({});
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    // ── Derived values ──────────────────────────────────────────────────────────
    const isDirty = useMemo(
        () =>
            (Object.keys(values) as (keyof ProfileFormValues)[]).some(
                (key) => values[key] !== initialValues[key]
            ),
        [values, initialValues]
    );

    const isPasswordDirty =
        passwordValues.currentPassword !== "" ||
        passwordValues.newPassword !== "" ||
        passwordValues.confirmPassword !== "";

    const initials = getInitials(values.fullName, values.username);
    const bioCount = values.bio.length;
    const strength = getPasswordStrength(passwordValues.newPassword);
    const canSave = isDirty && !isSaving;
    const canUpdatePassword = isPasswordDirty && !isChangingPassword;

    // ── Profile handlers ────────────────────────────────────────────────────────
    const handleChange =
        (name: keyof ProfileFormValues) =>
            (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                const nextValue = event.target.value;
                setValues((prev) => ({ ...prev, [name]: nextValue }));
                if (touched[name]) {
                    setErrors((prev) => ({ ...prev, [name]: validateProfileField(name, nextValue) }));
                }
            };

    const handleBlur = (name: keyof ProfileFormValues) => () => {
        setTouched((prev) => ({ ...prev, [name]: true }));
        setErrors((prev) => ({ ...prev, [name]: validateProfileField(name, values[name]) }));
    };

    const handleCancel = () => {
        setValues(initialValues);
        setErrors({});
        setTouched({});
        toast("Changes discarded");
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const nextErrors = validateProfileForm(values);
        setErrors(nextErrors);
        setTouched({ fullName: true, username: true, email: true, bio: true, phone: true, location: true });

        if (Object.keys(nextErrors).length > 0) {
            toast.error("Please fix the highlighted fields before saving.");
            return;
        }

        try {
            setIsSaving(true);
            await new Promise((resolve) => setTimeout(resolve, 900));
            setInitialValues(values);
            setTouched({});
            toast.success("Profile updated successfully.");
        } catch {
            toast.error("Something went wrong. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    // ── Password handlers ───────────────────────────────────────────────────────
    const handlePasswordChange =
        (name: keyof PasswordFormValues) =>
            (event: React.ChangeEvent<HTMLInputElement>) => {
                const nextValue = event.target.value;
                const nextValues = { ...passwordValues, [name]: nextValue };
                setPasswordValues(nextValues);

                if (passwordTouched[name]) {
                    setPasswordErrors((prev) => ({
                        ...prev,
                        [name]: validatePasswordField(name, nextValue, nextValues),
                    }));
                }

                // Re-validate confirm when new password changes so match error clears live
                if (name === "newPassword" && passwordTouched.confirmPassword) {
                    setPasswordErrors((prev) => ({
                        ...prev,
                        confirmPassword: validatePasswordField("confirmPassword", nextValues.confirmPassword, nextValues),
                    }));
                }
            };

    const handlePasswordBlur = (name: keyof PasswordFormValues) => () => {
        setPasswordTouched((prev) => ({ ...prev, [name]: true }));
        setPasswordErrors((prev) => ({
            ...prev,
            [name]: validatePasswordField(name, passwordValues[name], passwordValues),
        }));
    };

    const handlePasswordClear = () => {
        setPasswordValues(EMPTY_PASSWORD);
        setPasswordErrors({});
        setPasswordTouched({});
    };

    const handlePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const nextErrors = validatePasswordForm(passwordValues);
        setPasswordErrors(nextErrors);
        setPasswordTouched({ currentPassword: true, newPassword: true, confirmPassword: true });

        if (Object.keys(nextErrors).length > 0) {
            toast.error("Please fix the highlighted fields before updating.");
            return;
        }

        try {
            setIsChangingPassword(true);
            await new Promise((resolve) => setTimeout(resolve, 900));
            handlePasswordClear();
            setShowCurrent(false);
            setShowNew(false);
            setShowConfirm(false);
            toast.success("Password updated successfully.");
        } catch {
            toast.error("Could not update password. Please try again.");
        } finally {
            setIsChangingPassword(false);
        }
    };

    // ── Render ──────────────────────────────────────────────────────────────────
    return (
        <div className="flex h-screen bg-slate-50">
            <Sidebar userName={group_name} userType="mentee" />
            <main className="flex-1 overflow-y-auto">
                <div className="py-8 px-4 sm:py-12">
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                        Edit profile
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Update your personal information. Changes are saved to your account.
                    </p>

                    {/* ── Profile form ── */}
                    <Card className="border-slate-200 shadow-sm">
                        <form onSubmit={handleSubmit} noValidate>
                            <CardHeader>
                                <CardTitle className="text-lg">Profile details</CardTitle>
                                <CardDescription>
                                    This information may appear on your public profile.
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-6">
                                {/* Avatar */}
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-16 w-16 border border-slate-200">
                                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-base font-semibold text-white">

                                        </AvatarFallback>
                                    </Avatar>
                                    <p className="text-sm font-medium text-slate-900">{group_name}</p>
                                </div>

                                {/* Full name */}
                                <div className="space-y-2">
                                    <Label htmlFor="fullName">
                                        Full name <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="fullName"
                                        name="fullName"
                                        autoComplete="name"
                                        placeholder="Enter your full name"
                                        value={values.fullName}
                                        onChange={handleChange("fullName")}
                                        onBlur={handleBlur("fullName")}
                                        aria-invalid={Boolean(errors.fullName)}
                                        aria-describedby={errors.fullName ? "fullName-error" : undefined}
                                    />
                                    {errors.fullName && (
                                        <p id="fullName-error" className="text-xs text-red-500">
                                            {errors.fullName}
                                        </p>
                                    )}
                                </div>

                                {/* Username */}
                                <div className="space-y-2">
                                    <Label htmlFor="username">
                                        Username <span className="text-red-500">*</span>
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-slate-500">@</span>
                                        <Input
                                            id="username"
                                            name="username"
                                            autoComplete="username"
                                            placeholder="your_handle"
                                            value={values.username}
                                            onChange={handleChange("username")}
                                            onBlur={handleBlur("username")}
                                            aria-invalid={Boolean(errors.username)}
                                            aria-describedby={errors.username ? "username-error" : "username-hint"}
                                        />
                                    </div>
                                    {errors.username ? (
                                        <p id="username-error" className="text-xs text-red-500">
                                            {errors.username}
                                        </p>
                                    ) : (
                                        <p id="username-hint" className="text-xs text-slate-500">
                                            3–20 characters. Letters, numbers, and underscores only.
                                        </p>
                                    )}
                                </div>

                                {/* Email */}
                                <div className="space-y-2">
                                    <Label htmlFor="email">
                                        Email <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        placeholder="you@example.com"
                                        value={values.email}
                                        onChange={handleChange("email")}
                                        onBlur={handleBlur("email")}
                                        aria-invalid={Boolean(errors.email)}
                                        aria-describedby={errors.email ? "email-error" : undefined}
                                    />
                                    {errors.email && (
                                        <p id="email-error" className="text-xs text-red-500">
                                            {errors.email}
                                        </p>
                                    )}
                                </div>

                                {/* Phone */}
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone number</Label>
                                    <Input
                                        id="phone"
                                        name="phone"
                                        type="tel"
                                        autoComplete="tel"
                                        placeholder="+1 555 000 1234"
                                        value={values.phone}
                                        onChange={handleChange("phone")}
                                        onBlur={handleBlur("phone")}
                                        aria-invalid={Boolean(errors.phone)}
                                        aria-describedby={errors.phone ? "phone-error" : undefined}
                                    />
                                    {errors.phone && (
                                        <p id="phone-error" className="text-xs text-red-500">
                                            {errors.phone}
                                        </p>
                                    )}
                                </div>

                                {/* Location */}
                                <div className="space-y-2">
                                    <Label htmlFor="location">Location</Label>
                                    <Input
                                        id="location"
                                        name="location"
                                        autoComplete="address-level2"
                                        placeholder="City, Country"
                                        value={values.location}
                                        onChange={handleChange("location")}
                                        onBlur={handleBlur("location")}
                                        aria-invalid={Boolean(errors.location)}
                                        aria-describedby={errors.location ? "location-error" : undefined}
                                    />
                                    {errors.location && (
                                        <p id="location-error" className="text-xs text-red-500">
                                            {errors.location}
                                        </p>
                                    )}
                                </div>

                                {/* Bio */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="bio">Bio</Label>
                                        <span
                                            className={`text-xs ${bioCount > MAX_BIO_LENGTH ? "text-red-500" : "text-slate-400"
                                                }`}
                                        >
                                            {bioCount}/{MAX_BIO_LENGTH}
                                        </span>
                                    </div>
                                    <Textarea
                                        id="bio"
                                        name="bio"
                                        rows={4}
                                        placeholder="Tell us a little about yourself…"
                                        value={values.bio}
                                        onChange={handleChange("bio")}
                                        onBlur={handleBlur("bio")}
                                        aria-invalid={Boolean(errors.bio)}
                                        aria-describedby={errors.bio ? "bio-error" : undefined}
                                    />
                                    {errors.bio && (
                                        <p id="bio-error" className="text-xs text-red-500">
                                            {errors.bio}
                                        </p>
                                    )}
                                </div>
                            </CardContent>

                            <CardFooter className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-end">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleCancel}
                                    disabled={!isDirty || isSaving}
                                    className="w-full sm:w-auto"
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={!canSave} className="w-full sm:w-auto">
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Saving…
                                        </>
                                    ) : (
                                        "Save changes"
                                    )}
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>

                    {/* ── Password form ── */}
                    <Card className="mt-6 border-slate-200 shadow-sm">
                        <form onSubmit={handlePasswordSubmit} noValidate>
                            <CardHeader>
                                <CardTitle className="text-lg">Change password</CardTitle>
                                <CardDescription>
                                    Use a strong password with at least 8 characters, mixing letters, numbers,
                                    and symbols.
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-6">
                                {/* Current password */}
                                <div className="space-y-2">
                                    <Label htmlFor="currentPassword">
                                        Current password <span className="text-red-500">*</span>
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="currentPassword"
                                            name="currentPassword"
                                            type={showCurrent ? "text" : "password"}
                                            autoComplete="current-password"
                                            placeholder="Enter your current password"
                                            value={passwordValues.currentPassword}
                                            onChange={handlePasswordChange("currentPassword")}
                                            onBlur={handlePasswordBlur("currentPassword")}
                                            aria-invalid={Boolean(passwordErrors.currentPassword)}
                                            aria-describedby={
                                                passwordErrors.currentPassword ? "currentPassword-error" : undefined
                                            }
                                            className="pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowCurrent((v) => !v)}
                                            className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
                                            aria-label={showCurrent ? "Hide password" : "Show password"}
                                            tabIndex={-1}
                                        >
                                            {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    {passwordErrors.currentPassword && (
                                        <p id="currentPassword-error" className="text-xs text-red-500">
                                            {passwordErrors.currentPassword}
                                        </p>
                                    )}
                                </div>

                                {/* New password */}
                                <div className="space-y-2">
                                    <Label htmlFor="newPassword">
                                        New password <span className="text-red-500">*</span>
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="newPassword"
                                            name="newPassword"
                                            type={showNew ? "text" : "password"}
                                            autoComplete="new-password"
                                            placeholder="At least 8 characters"
                                            value={passwordValues.newPassword}
                                            onChange={handlePasswordChange("newPassword")}
                                            onBlur={handlePasswordBlur("newPassword")}
                                            aria-invalid={Boolean(passwordErrors.newPassword)}
                                            aria-describedby={
                                                passwordErrors.newPassword ? "newPassword-error" : "newPassword-hint"
                                            }
                                            className="pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNew((v) => !v)}
                                            className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
                                            aria-label={showNew ? "Hide password" : "Show password"}
                                            tabIndex={-1}
                                        >
                                            {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>

                                    {/* Strength meter */}
                                    {passwordValues.newPassword && (
                                        <div className="space-y-1">
                                            <div className="flex h-1.5 gap-1">
                                                {[1, 2, 3, 4, 5].map((tier) => (
                                                    <div
                                                        key={tier}
                                                        className={`h-full flex-1 rounded-full transition-colors ${tier <= strength.score ? strength.color : "bg-slate-200"
                                                            }`}
                                                    />
                                                ))}
                                            </div>
                                            {strength.label && (
                                                <p className="text-xs text-slate-500">
                                                    Strength:{" "}
                                                    <span className="font-medium text-slate-700">{strength.label}</span>
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {passwordErrors.newPassword ? (
                                        <p id="newPassword-error" className="text-xs text-red-500">
                                            {passwordErrors.newPassword}
                                        </p>
                                    ) : (
                                        !passwordValues.newPassword && (
                                            <p id="newPassword-hint" className="text-xs text-slate-500">
                                                Use 8+ characters with uppercase, lowercase, and numbers.
                                            </p>
                                        )
                                    )}
                                </div>

                                {/* Confirm password */}
                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">
                                        Confirm new password <span className="text-red-500">*</span>
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            type={showConfirm ? "text" : "password"}
                                            autoComplete="new-password"
                                            placeholder="Re-enter your new password"
                                            value={passwordValues.confirmPassword}
                                            onChange={handlePasswordChange("confirmPassword")}
                                            onBlur={handlePasswordBlur("confirmPassword")}
                                            aria-invalid={Boolean(passwordErrors.confirmPassword)}
                                            aria-describedby={
                                                passwordErrors.confirmPassword ? "confirmPassword-error" : undefined
                                            }
                                            className="pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirm((v) => !v)}
                                            className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
                                            aria-label={showConfirm ? "Hide password" : "Show password"}
                                            tabIndex={-1}
                                        >
                                            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    {passwordErrors.confirmPassword && (
                                        <p id="confirmPassword-error" className="text-xs text-red-500">
                                            {passwordErrors.confirmPassword}
                                        </p>
                                    )}
                                </div>
                            </CardContent>

                            <CardFooter className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-end">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handlePasswordClear}
                                    disabled={!isPasswordDirty || isChangingPassword}
                                    className="w-full sm:w-auto"
                                >
                                    Clear
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={!canUpdatePassword}
                                    className="w-full sm:w-auto"
                                >
                                    {isChangingPassword ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Updating…
                                        </>
                                    ) : (
                                        "Update password"
                                    )}
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                </div>
            </ main>
        </div>
    );
}
