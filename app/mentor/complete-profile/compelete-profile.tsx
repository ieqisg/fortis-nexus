"use client";

import { useState } from "react";
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
import { useNavigate } from "react-router-dom";
import { ArrowLeft, UserRound, Plus, X, Clock } from "lucide-react";
import { MentorFormProfile } from "@/app/types/mentorTypes";
import { UserAuth } from "@/app/context/authContext";
import { MentorInsert } from "@/app/types/modelTypes";
import { createMentorProfile } from "@/app/lib/actions/mentorActions";
import { useRouter } from "next/navigation";


//todo:: Copy how the mentee-create-profile can insert data into the database
export default function MentorCompleteProfile() {
    const { signUp, getUser, signIn } = UserAuth()
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

    })
    const [skillInput, setSkillInput] = useState("");
    const [forteInput, setForteInput] = useState("");
    const router = useRouter()


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const signUpResult = await signUp()
            if (!signUpResult) return;

            const signInResult = await signIn()
            if (!signInResult) return;

            const userResult = await getUser()
            if (!userResult.success || !userResult.data?.user) return;

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
            }
            const result = await createMentorProfile(payload)

            if (!result.success) {
                alert(result.message)
                return;
            }
            alert("Profile completed successfully")
            router.push("/mentor-dashboard")
        } catch (err) {
            console.error(err)

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

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4">
            <div className="max-w-2xl mx-auto">
                <Button variant="ghost" className="mb-6">
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
                            <div className="grid grid-cols-2 gap-4">
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
                                        placeholder="e.g. Python, Machine Learning, Image Processing etc."
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
                                        placeholder="e.g., Coding, System Design, Theory, Research etc."
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
                                    <CardContent>
                                        <div className="flex items-center gap-4">
                                            <Label htmlFor="capacity" className="text-base">
                                                Maximum Mentees
                                            </Label>
                                            <Input
                                                id="capacity"
                                                type="number"
                                                value={formData.mentor_capacity}
                                                min={1}
                                                max={10}
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

                            <div className="flex gap-2 justify-end">
                                <Button
                                    type="submit"
                                    className=" bg-gray-600 "
                                /* onClick={onBack} */
                                >
                                    Back
                                </Button>
                                <Button
                                    type="submit"
                                    className=" bg-blue-600 hover:bg-blue-700"
                                >
                                    Create Mentor Account
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
