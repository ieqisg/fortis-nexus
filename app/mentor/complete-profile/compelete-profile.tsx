"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AvailabilitySelector } from "@/components/ui/AvailabilitySelector";
import { SearchableTagSelect } from "@/components/ui/SearchableTagSelect";
import { TECHNICAL_SKILLS_OPTIONS, FORTE_OPTIONS } from "@/lib/mentorOptions";
import { ArrowLeft, UserRound, Users, Clock, Check, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { MentorFormProfile } from "@/types/mentorTypes";
import { UserAuth } from "@/app/context/authContext";
import { MentorInsert } from "@/types/modelTypes";
import { createMentorProfile, changeDefaultPassword } from "@//lib/actions/mentorActions";
import { getMenteeCount, getMentorCapacityStats } from "@//lib/actions/adminActions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
export default function MentorCompleteProfile() {
    const router = useRouter()

    const { getUser, signIn, signOut } = UserAuth()
    const [loading, setLoading] = useState(false)
    const [menteeCount, setMenteeCount] = useState<number | null>(null)
    const [formDataValid, setFormDataValid] = useState(true)
    const [capacityStats, setCapacityStats] = useState<{
        totalMentors: number
        mentorsWithCapacity: number
        totalCapacitySet: number
    } | null>(null)
    const [formData, setFormData] = useState<MentorFormProfile>({
        first_name: "",
        last_name: "",
        technical_skills: [],
        self_description: "",
        forte: [],
        mentor_capacity: 1,
        available_days: [],
        time_slot: [],
        role: "mentor",
        profile_completed: true,
        email: "",
    })

    const [passwordData, setPasswordData] = useState({
        newPassword: "",
        confirmPassword: "",
    })
    const [passwordError, setPasswordError] = useState("")
    const [dpaDecision, setDpaDecision] = useState<"accept" | "reject" | null>(null)

    const [showpasswordData, setShowpasswordData] = useState(false)
    const [showConfirmpasswordData, setShowConfirmpasswordData] = useState(false)

    const isLengthValid = passwordData.newPassword.length >= 8;
    const hasUppercase = /[A-Z]/.test(passwordData.newPassword);
    const hasNumber = /\d/.test(passwordData.newPassword);
    const hasSpecialChar = /[!@#$%^&*\-_]/.test(passwordData.newPassword);
    const isPasswordStrong =
        isLengthValid && hasUppercase && hasNumber && hasSpecialChar;

    useEffect(() => {
        Promise.all([getMenteeCount(), getMentorCapacityStats()]).then(([mentee, stats]) => {
            if (mentee.success) setMenteeCount(mentee.count)
            if (stats.success) setCapacityStats({
                totalMentors: stats.totalMentors,
                mentorsWithCapacity: stats.mentorsWithCapacity,
                totalCapacitySet: stats.totalCapacitySet,
            })
        })
    }, [])

    useEffect(() => {
        if (passwordData.newPassword === "" && passwordData.confirmPassword === "") {
            setPasswordError("");
        } else if (!isPasswordStrong) {
            setPasswordError(
                "Password must be at least 8 characters, include uppercase, number, and special character (_ or - included).",
            );
        } else if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordError("Passwords do not match.");
        } else {
            setPasswordError("");
        }
    }, [passwordData, passwordData.confirmPassword, isPasswordStrong]);

    const renderCheck = (valid: boolean) => (
        <span
            className={`flex items-center gap-1 ${valid ? "text-green-600" : "text-gray-400"
                }`}
        >
            {valid && <Check className="w-4 h-4" />}
        </span>
    );


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (dpaDecision !== "accept") {
            toast.error("You must accept the DPA consent to complete your mentor profile.")
            return
        }
        try {
            setLoading(true)
            const signInResult = await signIn()
            if (!signInResult) return;

            const userResult = await getUser()
            if (!userResult.success || !userResult.data?.user) return;

            const passwordChange = await changeDefaultPassword(passwordData.newPassword)
            if (!passwordChange) return;

            const payload: Omit<MentorInsert, 'id' | 'profile_completed'> = {
                first_name: formData.first_name,
                last_name: formData.last_name,
                technical_skills: formData.technical_skills,
                self_description: formData.self_description,
                forte: formData.forte,
                mentor_capacity: formData.mentor_capacity,
                available_days: formData.available_days,
                time_slot: formData.time_slot,
                role: "mentor",
                dpa_consent_accepted: true,
            }
            const result = await createMentorProfile(payload)

            if (result.success) {
                toast.success("Mentor Profile Completed, Please Login again with your changed password")
                await signOut()
                router.push("/")
            } else {
                toast.error(result.message ?? "Failed to complete mentor profile")
            }
        } catch (err) {
            toast.error("An unexpected error occured")

        } finally {
            setLoading(false)
        }

    };

    const handleCancel = async (e: React.FormEvent) => {
        e.preventDefault();

        if (window.confirm("Are you sure you want to cancel your profile creation?")) {
            try {
                const user = await getUser();
                if (!user) return;

                const cancel = await signOut();
                if (cancel.success) {
                    toast.success("Cancelled successfully");
                    router.push("/");
                }
            } catch (err) {
                toast.error("An unexpected error occurred");
            }
        }
    }

    const isFormDataValid = () => {
        return (
            formData.first_name.trim() !== "" &&
            formData.last_name.trim() !== "" &&
            formData.technical_skills.length > 0 &&
            formData.self_description.trim() !== "" &&
            formData.forte.length > 0 &&
            formData.mentor_capacity > 0 &&
            formData.available_days.length > 0 &&
            formData.time_slot.length > 0 &&
            formData.role.trim() !== "" &&
            dpaDecision === "accept"
        );
    };


    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4">
            <div className="max-w-2xl mx-auto">
                <Button variant="ghost" className="mb-6" onClick={handleCancel}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Home
                </Button>

                <Card>
                    <CardHeader>
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <UserRound className="w-10 h-10 text-blue-700" />
                        </div>
                        <CardTitle className="text-center text-2xl">
                            Mentor Profile
                        </CardTitle>
                        <CardDescription className="text-center">
                            Create your mentor profile to guide students
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="name">First Name *</Label>
                                    <Input
                                        id="name"
                                        required
                                        placeholder="John"
                                        value={formData.first_name}
                                        onChange={(e) =>
                                            setFormData({ ...formData, first_name: e.target.value })
                                        }
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="surname">Last Name *</Label>
                                    <Input
                                        id="surname"
                                        placeholder="Doe"
                                        required
                                        value={formData.last_name}
                                        onChange={(e) =>
                                            setFormData({ ...formData, last_name: e.target.value })
                                        }
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Technical Skills *</Label>
                                <SearchableTagSelect
                                    options={TECHNICAL_SKILLS_OPTIONS}
                                    selected={formData.technical_skills}
                                    onChange={(tags) => setFormData((prev) => ({ ...prev, technical_skills: tags }))}
                                    placeholder="Search languages, frameworks, tools..."
                                    badgeClassName="border-green-200 text-green-800 bg-green-100"
                                />
                                <div className="space-y-2">
                                    <Label htmlFor="description">
                                        Brief Description about yourself*
                                    </Label>
                                    <Textarea
                                        id="description"
                                        required
                                        placeholder="Describe your background, research interests, Focus on your technical background and notable projects..."
                                        rows={6}
                                        value={formData.self_description}
                                        onChange={(e) =>
                                            setFormData({ ...formData, self_description: e.target.value })
                                        }
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Forte / Specialization *</Label>
                                <SearchableTagSelect
                                    options={FORTE_OPTIONS}
                                    selected={formData.forte}
                                    onChange={(tags) => setFormData((prev) => ({ ...prev, forte: tags }))}
                                    placeholder="Search algorithms, domains, research areas..."
                                    badgeClassName="border-green-200 text-green-800 bg-green-100"
                                />
                            </div>
                            <div className="space-y-2 relative">
                                <Label htmlFor="description">
                                    Change your password *
                                </Label>

                                <div className="relative">
                                    <Input
                                        type={showpasswordData ? "text" : "password"}
                                        required
                                        placeholder="Change your password"
                                        value={passwordData.newPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                        className="pr-10"
                                    />

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-2 top-1/2 -translate-y-1/2"
                                        onClick={() => setShowpasswordData(!showpasswordData)}
                                    >
                                        {showpasswordData ? (
                                            <EyeOff className="w-5 h-5" />
                                        ) : (
                                            <Eye className="w-5 h-5" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                            <ul className="mt-2 text-sm space-y-1">
                                <li className="flex items-center gap-1">
                                    {renderCheck(isLengthValid)} At least 8 characters
                                </li>
                                <li className="flex items-center gap-1">
                                    {renderCheck(hasUppercase)} Contains uppercase letter
                                </li>
                                <li className="flex items-center gap-1">
                                    {renderCheck(hasNumber)} Contains number
                                </li>
                                <li className="flex items-center gap-1">
                                    {renderCheck(hasSpecialChar)} Contains special character
                                    (!@#$%^&*-_)
                                </li>
                            </ul>
                            <div className="space-y-2 relative">
                                <Label htmlFor="description">
                                    Confirm password *
                                </Label>

                                <div className="relative">
                                    <Input
                                        type={showConfirmpasswordData ? "text" : "password"}
                                        required
                                        placeholder="Confirm your password"
                                        value={passwordData.confirmPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                        className="pr-10" // add padding so text doesn't overlap the icon
                                    />

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-2 top-1/2 -translate-y-1/2"
                                        onClick={() => setShowConfirmpasswordData(!showConfirmpasswordData)}
                                    >
                                        {showConfirmpasswordData ? (
                                            <EyeOff className="w-5 h-5" />
                                        ) : (
                                            <Eye className="w-5 h-5" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                            {passwordError && (
                                <p className="text-red-600 text-sm">{passwordError}</p>
                            )}

                            <div>
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">
                                            Mentoring Capacity
                                        </CardTitle>
                                        <CardDescription>
                                            How many mentee groups can you take
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {menteeCount !== null && capacityStats !== null && (
                                            capacityStats.totalCapacitySet >= menteeCount ? (
                                                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-100 text-sm">
                                                    <Users className="w-4 h-4 text-green-600 shrink-0" />
                                                    <span className="text-green-800 font-medium">
                                                        All {menteeCount} mentee group{menteeCount !== 1 ? "s" : ""} have been covered.
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100 text-sm">
                                                    <Users className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                                                    <div className="text-blue-800 space-y-1">
                                                        <p>
                                                            <strong>{capacityStats.mentorsWithCapacity}</strong> of{" "}
                                                            <strong>{capacityStats.totalMentors}</strong> mentor{capacityStats.totalMentors !== 1 ? "s" : ""} have already set their capacity,
                                                            covering <strong>{capacityStats.totalCapacitySet}</strong> mentee group{capacityStats.totalCapacitySet !== 1 ? "s" : ""}.
                                                        </p>
                                                        <p>
                                                            <strong>{menteeCount - capacityStats.totalCapacitySet}</strong> of{" "}
                                                            <strong>{menteeCount}</strong> mentee group{menteeCount !== 1 ? "s" : ""} still need to be covered.
                                                        </p>
                                                    </div>
                                                </div>
                                            )
                                        )}
                                        <div className="flex items-center gap-4">
                                            <Label htmlFor="capacity" className="text-base">
                                                Maximum Mentees
                                            </Label>
                                            <Input
                                                id="capacity"
                                                type="number"
                                                value={formData.mentor_capacity}
                                                min={1}
                                                max={20}
                                                onChange={(e) => setFormData({ ...formData, mentor_capacity: Number(e.target.value) })}
                                                className="w-24"
                                            />
                                            <span className="text-slate-500">groups</span>
                                        </div>
                                    </CardContent>
                                </Card>
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
                                            selectedDays={formData.available_days}
                                            selectedTimeSlots={formData.time_slot}
                                            onDaysChange={(days) => setFormData((prev) => ({ ...prev, available_days: days }))}
                                            onTimeSlotsChange={(time) => setFormData((prev) => ({ ...prev, time_slot: time }))}
                                        />
                                    </CardContent>
                                </Card>
                            </div>

                            <div>
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <ShieldCheck className="w-5 h-5 text-blue-600" />
                                            Data Privacy Agreement
                                        </CardTitle>
                                        <CardDescription>
                                            Consent is required before your profile can be used for mentor matching.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                                            <p>
                                                By accepting, you agree that Fortis Nexus may collect, store, and use the information you provide in your mentor profile for academic mentor matching and related system functions. This includes your research background, technical skills, areas of specialization, published papers, and previous mentored thesis papers.
                                            </p>
                                            <p className="mt-2">
                                                This information may be processed to evaluate mentor-mentee compatibility, generate matching results, display relevant mentor profile details to authorized users, and support administrative review. The system will use this information only for Fortis Nexus academic advising and matching purposes.
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setDpaDecision("accept")}
                                                className={`rounded-lg border p-4 text-left transition ${dpaDecision === "accept"
                                                    ? "border-blue-600 bg-blue-50 text-blue-900"
                                                    : "border-slate-200 bg-white text-slate-700 hover:border-blue-300"
                                                    }`}
                                            >
                                                <span className="font-semibold">Accept</span>
                                                <span className="block text-sm mt-1">
                                                    I agree to the use of my published papers and previous mentored thesis paper information for matching.
                                                </span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setDpaDecision("reject")}
                                                className={`rounded-lg border p-4 text-left transition ${dpaDecision === "reject"
                                                    ? "border-red-500 bg-red-50 text-red-900"
                                                    : "border-slate-200 bg-white text-slate-700 hover:border-red-300"
                                                    }`}
                                            >
                                                <span className="font-semibold">Reject</span>
                                                <span className="block text-sm mt-1">
                                                    I do not agree to this data use and understand that my mentor profile cannot be completed.
                                                </span>
                                            </button>
                                        </div>

                                        {dpaDecision === "reject" && (
                                            <p className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                                                Your profile cannot be completed without this consent because the matching process uses these details to evaluate compatibility.
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>


                            <div className="flex gap-2 justify-end">
                                <Button
                                    type="button"
                                    className=" bg-gray-600 "
                                    onClick={handleCancel}
                                    disabled={loading}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    disabled={loading || !isFormDataValid()}
                                    type="submit"
                                    className=" bg-blue-600 hover:bg-blue-700"
                                >
                                    {loading ? "Submitting Mentor Profile" : "Complete Mentor Profile"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
