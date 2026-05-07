"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Eye, EyeOff, Loader2, Clock, Plus, X } from "lucide-react";

import type {
    ProfileFormValues,
    ProfileFormErrors,
    ProfileTouchedFields,
    PasswordFormValues,
    PasswordFormErrors,
    PasswordTouchedFields,
} from "@/types/profile_types";

import { MentorUpdate } from "@/types/modelTypes";
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
import { UserAuth } from "@/app/context/authContext";
import { editMentorProfile, verifyCurrentPassword, changeDefaultPassword } from "@/lib/actions/mentorActions";
import { useMentor } from "@/app/context/mentorContext";
import { MentorEditForm } from "@/types/mentorTypes";
import { useRouter } from "next/navigation";


export default function mentorEditProfile() {
    const router = useRouter()
    const { mentor, loading, refetch } = useMentor();
    const { signOut } = UserAuth();
    const [initialValues, setInitialValues] = useState<ProfileFormValues>(EMPTY_PROFILE);
    const [values, setValues] = useState<ProfileFormValues>(EMPTY_PROFILE);
    const [isSaving, setIsSaving] = useState(false);

    const [passwordValues, setPasswordValues] = useState<PasswordFormValues>(EMPTY_PASSWORD);
    const [passwordErrors, setPasswordErrors] = useState<PasswordFormErrors>({});
    const [passwordTouched, setPasswordTouched] = useState<PasswordTouchedFields>({});
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const [formData, setFormData] = useState<MentorEditForm>({
        available_days: [],
        email: "",
        experience: 1,
        first_name: "",
        forte: [],
        last_name: "",
        mentor_capacity: 1,
        self_description: "",
        technical_skills: [],
        time_slot: [],
    });

    const [skillInput, setSkillInput] = useState("");
    const [forteInput, setForteInput] = useState("");


    // ── Handlers ────────────────────────────────────────────────────────────────

    const handleCancel = () => {
        alert("Changes in the profile were cancelled");
    };

    const addSkill = () => {
        const value = skillInput.trim();
        if (!value) return;
        if ((formData.technical_skills).includes(value)) return;
        setFormData((prev) => ({
            ...prev,
            technical_skills: [...prev.technical_skills, value],
        }));
        setSkillInput("");
    };

    const addForte = () => {
        const value = forteInput.trim();
        if (!value) return;
        if (formData.forte.includes(value)) return;
        setFormData((prev) => ({
            ...prev,
            forte: [...prev.forte, value],
        }));
        setForteInput("");
    };

    const handleSkillKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            addSkill();
        }
    };

    const handleForteKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            addForte();
        }
    };

    // ── Derived values ──────────────────────────────────────────────────────────



    const isPasswordDirty =
        passwordValues.currentPassword !== "" ||
        passwordValues.newPassword !== "" ||
        passwordValues.confirmPassword !== "";


    const strength = getPasswordStrength(passwordValues.newPassword);
    const canUpdatePassword = isPasswordDirty && !isChangingPassword;

    const hasChanges =
        !!formData.first_name ||
        !!formData.last_name ||
        !!formData.self_description ||
        formData.technical_skills.length > 0 ||
        formData.forte.length > 0 ||
        formData.available_days.length > 0 ||
        formData.time_slot.length > 0;


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
    const handleChanges = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSaving(true);

            const payload: MentorUpdate = {};

            if (formData.first_name && formData.first_name !== mentor?.first_name)
                payload.first_name = formData.first_name;
            if (formData.last_name && formData.last_name !== mentor?.last_name)
                payload.last_name = formData.last_name;
            if (formData.self_description && formData.self_description !== mentor?.self_description)
                payload.self_description = formData.self_description;
            if (formData.technical_skills?.length)
                payload.technical_skills = formData.technical_skills;
            if (formData.forte?.length)
                payload.forte = formData.forte;
            if (formData.available_days?.length)
                payload.available_days = formData.available_days;
            if (formData.time_slot?.length)
                payload.time_slot = formData.time_slot;

            if (Object.keys(payload).length === 0) {
                toast.info("No changes to save.");
                return;
            }

            const result = await editMentorProfile(payload);

            if (result.success) {
                toast.success("Profile updated successfully.");
                window.location.reload();
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

    // ── Render ──────────────────────────────────────────────────────────────────
    return (
        <div className="flex h-screen bg-slate-50 overflow-y-hidden">
            <Sidebar userName={`${mentor?.first_name} ${mentor?.last_name}`} userType="mentor" />
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
                                    <p className="text-sm font-medium text-slate-900">
                                        {`${mentor?.first_name} ${mentor?.last_name}`}
                                    </p>
                                </div>

                                {/* First & Last Name */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="firstName">
                                            First name <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="firstName"
                                            placeholder="Enter your new first name"
                                            value={formData.first_name ?? ""}
                                            onChange={(e) =>
                                                setFormData({ ...formData, first_name: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="lastName">
                                            Last name <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="lastName"
                                            placeholder="Enter your new last name"
                                            value={formData.last_name ?? ""}
                                            onChange={(e) =>
                                                setFormData({ ...formData, last_name: e.target.value })
                                            }
                                        />
                                    </div>
                                </div>

                                {/* Self Description */}
                                <div className="space-y-2">
                                    <Label htmlFor="selfDescription">
                                        Self Description <span className="text-red-500">*</span>
                                    </Label>
                                    <Textarea
                                        id="selfDescription"
                                        rows={4}
                                        placeholder="Enter your new self description"
                                        value={formData.self_description ?? ""}
                                        onChange={(e) =>
                                            setFormData({ ...formData, self_description: e.target.value })
                                        }
                                    />
                                </div>

                                {/* Technical Skills */}
                                <div className="space-y-2">
                                    <Label htmlFor="technical-skills">Technical Skills *</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="technical-skills"
                                            placeholder="e.g. Python, Javascript, Java, C++ etc..."
                                            value={skillInput}
                                            onChange={(e) => setSkillInput(e.target.value)}
                                            onKeyDown={handleSkillKeyDown}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={addSkill}
                                            className="bg-blue-700"
                                        >
                                            <Plus className="w-4 h-4 text-white" />
                                        </Button>
                                    </div>
                                    <p className="text-sm text-gray-500">
                                        Add your technical skills and press Enter or click +
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {formData.technical_skills.map((skill, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm"
                                            >
                                                {skill}
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setFormData((prev) => ({
                                                            ...prev,
                                                            technical_skills: prev.technical_skills.filter((_, i) => i !== index),
                                                        }))
                                                    }
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Forte / Specialization */}
                                <div className="space-y-2">
                                    <Label htmlFor="forte">Forte/Specialization *</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="forte"
                                            placeholder="e.g. Image Processing, Machine Learning, Computer Vision etc..."
                                            value={forteInput}
                                            onChange={(e) => setForteInput(e.target.value)}
                                            onKeyDown={handleForteKeyDown}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={addForte}
                                            className="bg-blue-700"
                                        >
                                            <Plus className="w-4 h-4 text-white" />
                                        </Button>
                                    </div>
                                    <p className="text-sm text-gray-500">
                                        Add your Forte/Specialization and press Enter or click +
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {formData.forte.map((item, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm"
                                            >
                                                {item}
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setFormData((prev) => ({
                                                            ...prev,
                                                            forte: prev.forte.filter((_, i) => i !== index),
                                                        }))
                                                    }
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Availability */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Clock className="w-5 h-5 text-blue-600" /> Availability
                                        </CardTitle>
                                        <CardDescription>
                                            When are you available for mentoring sessions?
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
