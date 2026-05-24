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
import { Eye, EyeOff, Loader2, Clock } from "lucide-react";

import type {
    ProfileFormValues,
    ProfileFormErrors,
    ProfileTouchedFields,
    PasswordFormValues,
    PasswordFormErrors,
    PasswordTouchedFields,
} from "@/types/profile_types";
import { MenteeGroupUpdate } from "@/types/modelTypes";
import {
    EMPTY_PROFILE,
    EMPTY_PASSWORD,
    MAX_BIO_LENGTH,
    validateProfileField,
    validateProfileForm,
    validatePasswordField,
    validatePasswordForm,

} from "@/lib/profile_validators";
import { AvailabilitySelector } from "@/components/ui/AvailabilitySelector";

import { getInitials, getPasswordStrength } from "@/lib/profile_utils";
import Sidebar from "@/components/ui/Sidebar";
import { useMentee } from "@/app/context/menteeContext";
import { UserAuth } from "@/app/context/authContext";
import { changeDefaultPassword, editMenteeProfile } from "@/lib/actions/menteeActions";
import { MenteeEditForm } from "@/types/menteeTypes";
import { useRouter } from "next/navigation";
import { verifyCurrentPassword } from "@/lib/actions/menteeActions";

// ─── Component ────────────────────────────────────────────────────────────────

export default function MenteeEditProfile() {
    const router = useRouter()
    const { signOut } = UserAuth()
    const { mentee, loading, refetch } = useMentee()
    const { getUser } = UserAuth()
    // ── Profile form state ──────────────────────────────────────────────────────
    const [initialValues, setInitialValues] = useState<ProfileFormValues>(EMPTY_PROFILE);
    const [values, setValues] = useState<ProfileFormValues>(EMPTY_PROFILE);
    const [errors, setErrors] = useState<ProfileFormErrors>({});
    const [isSaving, setIsSaving] = useState(false);

    // ── Password form state ─────────────────────────────────────────────────────
    const [passwordValues, setPasswordValues] = useState<PasswordFormValues>(EMPTY_PASSWORD);
    const [passwordErrors, setPasswordErrors] = useState<PasswordFormErrors>({});
    const [passwordTouched, setPasswordTouched] = useState<PasswordTouchedFields>({});
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const [formData, setFormData] = useState<MenteeEditForm>({
        group_name: "",
        research_title: "",
        research_description: "",
        mentor_preference: "",
        available_days: [],
        time_slot: [],
    });


    const handleCancel = () => {
        toast("Changes in the profile were cancelled")
    }

    const hasChanges =
        !!formData.group_name ||
        !!formData.research_title ||
        !!formData.research_description ||
        !!formData.mentor_preference ||
        formData.available_days.length > 0 ||
        formData.time_slot.length > 0;



    const handleChanges = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSaving(true);

            const payload: MenteeGroupUpdate = {};

            if (formData.group_name && formData.group_name !== mentee?.group_name)
                payload.group_name = formData.group_name;
            if (formData.research_title && formData.research_title !== mentee?.research_title)
                payload.research_title = formData.research_title;
            if (formData.research_description && formData.research_description !== mentee?.research_description)
                payload.research_description = formData.research_description;
            if (formData.mentor_preference && formData.mentor_preference !== mentee?.mentor_preference)
                payload.mentor_preference = formData.mentor_preference;
            if (formData.available_days?.length)
                payload.available_days = formData.available_days;
            if (formData.time_slot?.length)
                payload.time_slot = formData.time_slot;

            // Nothing changed
            if (Object.keys(payload).length === 0) {
                toast.info("No changes to save.");
                return;
            }

            console.log("Payload from client side", payload);
            const result = await editMenteeProfile(payload);

            if (result.success) {
                toast.success("Profile updated successfully.");
                window.location.reload()

            } else {
                toast.error(result.message ?? "Failed to update profile.");
            }
        } catch (error) {
            console.error(error);
            toast.error("An unexpected error occurred.");
        } finally {
            setIsSaving(false);
        }
    };
    const isPasswordDirty =
        passwordValues.currentPassword !== "" ||
        passwordValues.newPassword !== "" ||
        passwordValues.confirmPassword !== "";

    const strength = getPasswordStrength(passwordValues.newPassword);
    const canUpdatePassword = isPasswordDirty && !isChangingPassword;

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

                if (name === "newPassword" && passwordTouched.confirmPassword) {
                    setPasswordErrors((prev) => ({
                        ...prev,
                        confirmPassword: validatePasswordField(
                            "confirmPassword",
                            nextValues.confirmPassword,
                            nextValues
                        ),
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

    const handlePasswordSubmit = async (
        event: React.FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        const nextErrors = validatePasswordForm(passwordValues);

        setPasswordErrors(nextErrors);

        setPasswordTouched({
            currentPassword: true,
            newPassword: true,
            confirmPassword: true,
        });

        if (Object.keys(nextErrors).length > 0) {
            toast.error("Please fix the highlighted fields before updating.");
            return;
        }

        setIsChangingPassword(true);

        try {
            const verify = await verifyCurrentPassword(
                passwordValues.currentPassword
            );

            if (!verify.success) {
                setPasswordErrors({
                    currentPassword:
                        verify.message ?? "Incorrect password.",
                });

                toast.error(
                    verify.message ?? "Incorrect password."
                );

                return;
            }

            const result = await changeDefaultPassword(
                passwordValues.newPassword
            );

            if (!result.success) {
                toast.error(
                    result.error ?? "Failed to update password."
                );

                return;
            }

            handlePasswordClear();

            setShowCurrent(false);
            setShowNew(false);
            setShowConfirm(false);

            // success toast
            toast.success(
                "Password updated successfully. Redirecting to homepage in 3 seconds..."
            );

            // wait AFTER toast is shown
            await new Promise((resolve) =>
                setTimeout(resolve, 3000)
            );

            await signOut();

            router.push("/");
        } catch {
            toast.error(
                "Could not update password. Please try again."
            );
        } finally {
            setIsChangingPassword(false);
        }
    };





    // ── Render ──────────────────────────────────────────────────────────────────
    return (
        <div className="flex h-screen bg-slate-50">
            <Sidebar userName={mentee?.group_name} userType="mentee" />
            <main className="flex-1 min-h-0 overflow-y-auto">
                <div className="py-8 px-4 sm:py-12">
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                        Edit profile
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Update your personal information. Changes are saved to your account.
                    </p>

                    {/* ── Profile form ── */}
                    <Card className="border-slate-200 shadow-sm">
                        <form onSubmit={handleChanges} noValidate>
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
                                        <AvatarFallback className="bg-linear-to-br from-blue-500 to-indigo-600 text-base font-semibold text-white">

                                        </AvatarFallback>
                                    </Avatar>
                                    <p className="text-sm font-medium text-slate-900">{mentee?.group_name}</p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="fullName">
                                        Group name <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="fullName"
                                        name="fullName"
                                        placeholder="Enter your new group name"
                                        value={formData.group_name}
                                        onChange={(e) =>
                                            setFormData({ ...formData, group_name: e.target.value })
                                        }
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
                                        Research Title <span className="text-red-500">*</span>
                                    </Label>
                                    <div className="flex items-center gap-2">

                                        <Input
                                            id="ResTitle"
                                            placeholder="Enter your new Thesis Title"
                                            value={formData.research_title}
                                            onChange={(e) =>
                                                setFormData({ ...formData, research_title: e.target.value })
                                            }
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

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="bio">Research Description</Label>

                                    </div>
                                    <Textarea
                                        id="resdesc"
                                        rows={4}
                                        placeholder="Enter your new Research Description"
                                        value={formData.research_description}
                                        onChange={(e) => setFormData({ ...formData, research_description: e.target.value })}
                                        aria-describedby={errors.bio ? "bio-error" : undefined}
                                    />

                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="bio">Mentor Preferences</Label>

                                    </div>
                                    <Textarea
                                        id="mentorpref"
                                        rows={4}
                                        placeholder="Enter your new Mentor Preferences"
                                        value={formData.mentor_preference}
                                        onChange={(e) => setFormData({ ...formData, mentor_preference: e.target.value })}
                                    />

                                </div>

                                <div>
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <Clock className="w-5 h-5 text-blue-600" /> Availability
                                            </CardTitle>
                                            <CardDescription>
                                                When is your group available for mentoring sessions?
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <AvailabilitySelector
                                                selectedDays={formData.available_days ?? []}
                                                selectedTimeSlots={formData.time_slot ?? []}

                                                onDaysChange={(days) =>
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        available_days: days,
                                                    }))
                                                }
                                                onTimeSlotsChange={(time) =>
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        time_slot: time,
                                                    }))
                                                }

                                            />

                                        </CardContent>
                                    </Card>
                                </div>

                            </CardContent>

                            <CardFooter className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-end">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleCancel}
                                    disabled={isSaving}
                                    className="w-full sm:w-auto"
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" className="w-full sm:w-auto" disabled={!hasChanges}>
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
            </main>
        </div>
    );
}
