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
import { UserAuth } from "@/app/context/authContext";
import { GroupMembers, MenteeFormProfile } from "@/app/types/menteeTypes";
import { MenteeGroupInsert } from "@/app/types/modelTypes";
import { createMenteeProfile } from "@/app/lib/actions/menteeActions";

export default function MenteeCreateProfile({
    onBack,
}: {
    onBack: () => void;
}) {

    // Form state
    const [formData, setFormData] = useState<MenteeFormProfile>({
        group_name: "",
        group_members: [{ name: "", student_number: "" }],
        role: "mentee",
        thesis_title: "",
        research_description: "",
        mentor_preferences: "",
        available_days: [],
        time_slot: [],

    });

    // Validation
    const isFormValid = () => {
        if (!formData) return false;

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

        if (formData.time_slot.length > 2 || formData.available_days.length > 2)
            return false;

        return true;
    };
    const router = useRouter();
    const { userData, signUp, getUser, signIn } = UserAuth();
    const [studentNumValid, setStudentNumValid] = useState("");
    const [disableAddMember, setDisableAddMember] = useState(true);
    const [timeAndDayValid, setTimeAndDayValid] = useState("");

    useEffect(() => {
        formData.group_members.forEach((student) => {
            if (student.student_number.length !== 9) {
                setStudentNumValid("Student Number should be exactly 9 digits");
                setDisableAddMember(false);
            } else {
                setStudentNumValid("");
                setDisableAddMember(true);
            }
        });
        if (formData.time_slot.length > 2 || formData.available_days.length > 2) {
            setTimeAndDayValid(
                "Selected Available Days or Time slots should not be longer than 2",
            );
        } else {
            setTimeAndDayValid("");
        }
    }, [
        formData.group_members.map((member) => member.student_number).join(","),
        formData.available_days.join(","),
        formData.time_slot.join(","),
    ]);

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

        try {
            const signUpResult = await signUp();
            if (!signUpResult.success) return;

            const signInResult = await signIn();
            if (!signInResult.success) return;

            const userResult = await getUser();
            if (!userResult.success || !userResult.data?.user) return;

            const payload: MenteeGroupInsert = {
                id: userResult.data.user.id,
                group_name: formData.group_name,
                research_title: formData.thesis_title,
                research_description: formData.research_description,
                mentor_preference: formData.mentor_preferences,
                role: "mentee",
                available_days: formData.available_days,
                time_slot: formData.time_slot,
                group_members: formData.group_members.map((member) => JSON.stringify(member))
            };

            const result = await createMenteeProfile(payload);

            if (!result.success) {
                alert(result.message);
                return;
            }

            alert("Mentee profile created successfully!");
            router.push("/mentee-dashboard");

        } catch (err) {
            console.error(err);
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
                                    onChange={(e) =>
                                        setFormData({ ...formData, group_name: e.target.value })
                                    }
                                />
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
                                <Input
                                    required
                                    id="thesisTitle"
                                    placeholder="Enter your thesis title"
                                    value={formData.thesis_title}
                                    onChange={(e) =>
                                        setFormData({ ...formData, thesis_title: e.target.value })
                                    }
                                />
                            </div>

                            {/* Thesis File */}
                            <div>
                                <Label htmlFor="thesisFile">
                                    Thesis 1 Document (Proposal){" "}
                                    <span className="text-red-600">*</span>
                                </Label>
                                <Input
                                    required
                                    type="file"
                                    id="thesis_file"
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            thesis_file: e.target.files ? e.target.files[0] : null,
                                        })
                                    }
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
                                        {timeAndDayValid && (
                                            <p className="text-red-600 text-sm mt-1">
                                                {timeAndDayValid}
                                            </p>
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
                                    disabled={!isFormValid()}
                                >
                                    Create Mentee Account
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
