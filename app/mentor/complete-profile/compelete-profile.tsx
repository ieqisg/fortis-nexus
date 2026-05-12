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
import { ArrowLeft, UserRound, Users, Plus, X, Clock, Check, Eye, EyeOff } from "lucide-react";
import { CommunicationPreference, MentorFormProfile } from "@/types/mentorTypes";
import { UserAuth } from "@/app/context/authContext";
import { MentorInsert } from "@/types/modelTypes";
import { createMentorProfile, changeDefaultPassword } from "@//lib/actions/mentorActions";
import { getMenteeCount, getMentorCapacityStats } from "@//lib/actions/adminActions";
import { useRouter } from "next/navigation";
import { Slider } from "@/components/ui/slider";
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
        experience: 0,
        communication_preference: "",
    })

    const [skillInput, setSkillInput] = useState("");
    const [forteInput, setForteInput] = useState("");
    const [passwordData, setPasswordData] = useState({
        newPassword: "",
        confirmPassword: "",
    })
    const [passwordError, setPasswordError] = useState("")

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
                experience: formData.experience,
                communication_preference: formData.communication_preference || null,
            }
            const result = await createMentorProfile(payload)

            if (result.success) {
                toast.success("Mentor Profile Completed, Please Login again with your changed password")
                await signOut()
                router.push("/")
            }
        } catch (err) {
            toast.error("An unexpected error occured")

        } finally {
            setLoading(false)
        }

    };

    const addSkill = () => {
        const value = skillInput.trim();
        if (!value) return;
        if (formData.technical_skills.includes(value)) return;
        setFormData((prev) => ({
            ...prev,
            technical_skills: [...prev.technical_skills, value]
        }));
        setSkillInput("");
    };

    const addForte = () => {
        const value = forteInput.trim();
        if (!value) return;
        if (formData.forte.includes(value)) return;

        setFormData((prev) => ({
            ...prev,
            forte: [...prev.forte, value]
        }));
        setForteInput("");
    };

    const handleSkillKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            addSkill();
            addForte();
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
            formData.experience >= 0 &&
            formData.communication_preference.trim() !== ""
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

                                {/* Added skills */}
                                <div className="flex flex-wrap gap-2">
                                    {formData.technical_skills.map((skills, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm"
                                        >
                                            {skills}
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        technical_skills: prev.technical_skills.filter((_, i) => i !== index)
                                                    }))
                                                }
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
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
                                <Label htmlFor="forte">Forte/Specialization *</Label>

                                <div className="flex gap-2">
                                    <Input
                                        id="Forte"
                                        placeholder="e.g. Image Processing, Machine Learning, Computer Vision etc..."
                                        value={forteInput}
                                        onChange={(e) => setForteInput(e.target.value)}
                                        onKeyDown={handleSkillKeyDown}
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
                                                        forte: prev.forte.filter((_, i) => i !== index)
                                                    }))
                                                }
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label
                                    htmlFor="forte"
                                    className="flex justify-between items-center w-full"
                                >
                                    <span>Experience *</span>
                                    <span className="text-gray-500">Years of Experience: <span className="text-black">{formData.experience}</span></span>
                                </Label>

                                <div className="flex gap-2">
                                    <Slider
                                        value={[formData.experience]}
                                        max={30}
                                        step={1}
                                        onValueChange={([exp]) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                experience: exp,
                                            }))
                                        }
                                    />                                </div>

                                <p className="text-sm text-gray-500">
                                    Input your years of being a research mentor
                                </p>


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
                                        <CardTitle className="text-lg">
                                            Communication Preference
                                        </CardTitle>
                                        <CardDescription>
                                            How do you prefer to communicate with your mentees?
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {/* Top-level choice */}
                                        <div className="flex gap-6">
                                            {(["FACE_TO_FACE", "ONLINE"] as const).map((mode) => {
                                                const isOnlineGroup = mode === "ONLINE";
                                                const checked = isOnlineGroup
                                                    ? formData.communication_preference === "ONLINE_CHAT" ||
                                                    formData.communication_preference === "ONLINE_CALL"
                                                    : formData.communication_preference === "FACE_TO_FACE";
                                                return (
                                                    <label key={mode} className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="comm_top"
                                                            checked={checked}
                                                            onChange={() => {
                                                                if (isOnlineGroup) {
                                                                    setFormData((prev) => ({
                                                                        ...prev,
                                                                        communication_preference: "ONLINE_CHAT",
                                                                    }));
                                                                } else {
                                                                    setFormData((prev) => ({
                                                                        ...prev,
                                                                        communication_preference: "FACE_TO_FACE",
                                                                    }));
                                                                }
                                                            }}
                                                            className="accent-blue-600"
                                                        />
                                                        <span className="text-sm font-medium">
                                                            {isOnlineGroup ? "Online" : "Face to Face"}
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>

                                        {/* Online sub-options */}
                                        {(formData.communication_preference === "ONLINE_CHAT" ||
                                            formData.communication_preference === "ONLINE_CALL") && (
                                                <div className="ml-6 flex gap-6 border-l-2 border-blue-100 pl-4">
                                                    {(["ONLINE_CHAT", "ONLINE_CALL"] as CommunicationPreference[]).map((sub) => (
                                                        <label key={sub} className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="radio"
                                                                name="comm_sub"
                                                                checked={formData.communication_preference === sub}
                                                                onChange={() =>
                                                                    setFormData((prev) => ({
                                                                        ...prev,
                                                                        communication_preference: sub,
                                                                    }))
                                                                }
                                                                className="accent-blue-600"
                                                            />
                                                            <span className="text-sm">
                                                                {sub === "ONLINE_CHAT" ? "Chat only" : "Online meeting / call"}
                                                            </span>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="flex gap-2 justify-end">
                                <Button
                                    type="submit"
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
