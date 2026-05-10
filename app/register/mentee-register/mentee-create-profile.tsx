"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Plus, X, Clock, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { CommunicationPreference, GroupMembers, MenteeFormProfile } from "@/types/menteeTypes";
import { registerMentee } from "@/lib/actions/menteeActions";
import { checkGroupNameAvailable } from "@/lib/actions/authActions";
import { UserAuth } from "@/app/context/authContext";
import { supabase } from "@/app/config/supabaseClient";
import { toast } from "sonner";

export default function MenteeCreateProfile({
    email,
    password,
    onBack,
}: {
    email: string;
    password: string;
    onBack: () => void;
}) {

    const router = useRouter();
    const { setUserData } = UserAuth();
    const [studentNumValid, setStudentNumValid] = useState("");
    const [disableAddMember, setDisableAddMember] = useState(true);
    const [timeAndDayValid, setTimeAndDayValid] = useState("")
    const [loading, setLoading] = useState(false)
    const [groupNameError, setGroupNameError] = useState("")

    // Form state
    const [formData, setFormData] = useState<MenteeFormProfile>({
        email: "",
        group_name: "",
        group_members: [{ name: "", student_number: "" }],
        role: "mentee",
        thesis_title: "",
        research_description: "",
        mentor_preferences: "",
        available_days: [],
        time_slot: [],
        communication_preference: "",
    });
    const studentNumbers = formData.group_members.map((m) => m.student_number).join(",")
    const availableDays = formData.available_days.join(",")
    const timeSlots = formData.time_slot.join(",")

    // Validation
    const isFormValid = () => {

        if (
            !formData.group_name ||
            !formData.group_members ||
            !formData.thesis_title ||
            !formData.research_description ||
            !formData.mentor_preferences ||
            !formData.available_days ||
            !formData.time_slot
        )
            return false;
        return true;
    };


    useEffect(() => {
        formData.group_members.forEach((student) => {
            if (student.student_number.length !== 9) {
                setStudentNumValid("Student Number should be exactly 9 digits")
                setDisableAddMember(false)
            } else {
                setStudentNumValid("")
                setDisableAddMember(true)
            }
        })

        const allDaysHaveSlots = formData.available_days.every(day =>
            formData.time_slot.some(s => s.startsWith(`${day}:`))
        )
        if (formData.available_days.length > 0 && !allDaysHaveSlots) {
            setTimeAndDayValid("Please select at least one time slot for each selected day")
        } else {
            setTimeAndDayValid("")
        }
    }, [studentNumbers, availableDays, timeSlots])

    // Handle dynamic member changes
    const updateMember = (
        index: number,
        field: keyof GroupMembers,
        value: string,
    ) => {
        setFormData((prev) => {
            const updatedMembers = [...prev.group_members];

            updatedMembers[index] = {
                ...updatedMembers[index],
                [field]: field === "student_number" ? String(value) : value,
            };

            return {
                ...prev,
                group_members: updatedMembers,
            };
        });
    };

    const addMember = () =>
        setFormData((prev) => ({
            ...prev,
            group_members: [...prev.group_members, { name: "", student_number: "" }],
        }));

    const removeMember = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            group_members: prev.group_members.filter((_, i) => i !== index),
        }));
    };
    // Handle submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid()) return;
        if (groupNameError) return;
        setLoading(true)
        try {
            const groupCheck = await checkGroupNameAvailable(formData.group_name)
            if (!groupCheck.available) {
                toast.error(groupCheck.message ?? "Group name already taken.")
                return
            }

            const payload = {
                email,
                group_name: formData.group_name,
                research_title: formData.thesis_title,
                research_description: formData.research_description,
                mentor_preference: formData.mentor_preferences,
                role: "mentee" as const,
                available_days: formData.available_days,
                time_slot: formData.time_slot,
                group_members: formData.group_members.map((member) => JSON.stringify(member)),
                communication_preference: formData.communication_preference || null,
            };

            const result = await registerMentee(email, password, payload);
            if (!result.success) {
                toast.error(result.message ?? "Registration failed. Please try again.")
                return
            }

            const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
            if (signInError) {
                toast.error("Account created but sign-in failed. Please log in manually.")
                router.push("/")
                return
            }

            setUserData({ email, password })
            toast.success("Account created successfully!")
            router.push("/mentee/mentee-dashboard")

        } catch (err) {
            toast.error("An unexpected error occurred")
        } finally {
            setLoading(false)
        }
    };


    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 py-12 px-4">
            <div className="max-w-2xl mx-auto">
                <Button variant="ghost" className="mb-6" onClick={onBack}>
                    <ArrowLeft className="w-4 h-4" />
                    Back To Home
                </Button>
                <Card>
                    <CardHeader>
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <UserRound className="w-10 h-10 text-green-700" />
                        </div>
                        <CardTitle className="text-center text-2xl">
                            Mentee Profile
                        </CardTitle>
                        <CardDescription className="text-center">
                            Register your thesis group to find the perfect mentor
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form className="space-y-5" onSubmit={handleSubmit}>
                            {/* Group Name */}
                            <div>
                                <Label htmlFor="groupName">
                                    Group Name <span className="text-red-600">*</span>
                                </Label>
                                <Input
                                    required
                                    id="groupName"
                                    placeholder="e.g Fortis Programmatores"
                                    value={formData.group_name}
                                    onChange={(e) => {
                                        const val = e.target.value
                                        setFormData({ ...formData, group_name: val })
                                        if (val && /[^a-zA-Z0-9\s]/.test(val)) {
                                            setGroupNameError("Group name must not contain special characters")
                                        } else {
                                            setGroupNameError("")
                                        }
                                    }}
                                    className={groupNameError ? "border-red-400 focus-visible:ring-red-400" : ""}
                                />
                                {groupNameError ? (
                                    <p className="text-red-500 text-xs mt-1">{groupNameError}</p>
                                ) : (
                                    <p className="text-slate-400 text-xs mt-1">Letters, numbers, and spaces only — no special characters</p>
                                )}
                            </div>

                            {/* Group Members */}
                            <div>
                                <Label>
                                    Group Members <span className="text-red-600">*</span>
                                </Label>
                                {formData.group_members.map((member, idx) => (
                                    <div key={idx} className="flex gap-2 mb-2">
                                        <Input
                                            required
                                            placeholder="Member name"
                                            value={member.name}
                                            onChange={(e) =>
                                                updateMember(idx, "name", e.target.value)
                                            }
                                        />
                                        <Input
                                            type="number"
                                            required
                                            placeholder="Student no."
                                            value={member.student_number}
                                            onChange={(e) =>
                                                updateMember(idx, "student_number", e.target.value)
                                            }
                                        />

                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={() => removeMember(idx)}
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={!disableAddMember}
                                    size="sm"
                                    className="mt-1"
                                    onClick={addMember}
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add member
                                </Button>
                                {studentNumValid && (
                                    <p className="text-red-600 text-sm mt-1">{studentNumValid}</p>
                                )}
                            </div>

                            {/* Thesis Title */}
                            <div>
                                <Label htmlFor="thesisTitle">
                                    Research/Thesis Title <span className="text-red-600">*</span>
                                </Label>
                                <Textarea
                                    required
                                    id="ThesisTItle"
                                    placeholder="Enter your resarch title"
                                    value={formData.thesis_title}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            thesis_title: e.target.value,
                                        })
                                    }
                                    rows={5}
                                />
                            </div>



                            {/* Research Description */}
                            <div>
                                <Label htmlFor="researchDesc">
                                    Research Description <span className="text-red-600">*</span>
                                </Label>
                                <Textarea
                                    required
                                    id="researchDesc"
                                    placeholder="Describe your research, tools/frameworks, and algorithms"
                                    value={formData.research_description}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            research_description: e.target.value,
                                        })
                                    }
                                    rows={5}
                                />
                            </div>

                            {/* Mentor Preferences */}
                            <div>
                                <Label htmlFor="mentorPrefs">
                                    Mentor Preferences <span className="text-red-600">*</span>
                                </Label>
                                <Textarea
                                    required
                                    id="mentorPrefs"
                                    placeholder="Describe what you're looking for in a mentor"
                                    value={formData.mentor_preferences}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            mentor_preferences: e.target.value,
                                        })
                                    }
                                    rows={5}
                                />
                                <p className="text-sm text-gray-500 mt-1">
                                    Be specific about the technical skills and expertise you need
                                    for your thesis
                                </p>
                            </div>

                            {/* Availability */}
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

                            {/* Communication Preference */}
                            <div>
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">
                                            Communication Preference
                                        </CardTitle>
                                        <CardDescription>
                                            How do you prefer to communicate with your mentor?
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
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
                                                            className="accent-green-600"
                                                        />
                                                        <span className="text-sm font-medium">
                                                            {isOnlineGroup ? "Online" : "Face to Face"}
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>

                                        {(formData.communication_preference === "ONLINE_CHAT" ||
                                          formData.communication_preference === "ONLINE_CALL") && (
                                            <div className="ml-6 flex gap-6 border-l-2 border-green-100 pl-4">
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
                                                            className="accent-green-600"
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

                            {/* Buttons */}
                            <div className="flex gap-2 justify-end">
                                <Button
                                    type="button"
                                    className="bg-gray-400 hover:bg-gray-500"
                                    onClick={onBack}
                                >
                                    Back
                                </Button>
                                <Button
                                    type="submit"
                                    className={`bg-green-600 hover:bg-green-700 ${!isFormValid() ? "opacity-50 cursor-not-allowed" : ""}`}
                                    disabled={!isFormValid() || loading}
                                >
                                    {loading ? "Creating Mentee Account" : "Create Mentee Account"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
