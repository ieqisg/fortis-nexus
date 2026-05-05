"use client";
import { ProfileField } from "@/components/ui/ProfileFiled";
import Sidebar from "@/components/ui/Sidebar";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardTitle,
    CardHeader,
    CardContent,
    CardDescription,
    CardFooter,
} from "@/components/ui/card";
import { UserRound, BookText, Clock, Calendar, Star, Pencil } from "lucide-react";
import { DetailRow } from "@/components/ui/DetailRow";
import { useRouter } from "next/navigation";
import { useMentee } from "@/app/context/menteeContext";
import { parseSlot } from "@/components/ui/AvailabilitySelector";

export default function MenteeProfileDetails() {

    const router = useRouter()
    const { mentee, loading } = useMentee()
    const goEditProfile = () => {
        router.push("./edit-profile/")
    }
    if (loading) return (<div>Loading...</div>)

    return (
        <div className="flex h-screen bg-slate-50">
            <Sidebar userType="mentee" userName={mentee?.group_name} />

            <main className="flex-1 overflow-y-auto">
                <div className="mx-auto w-full px-6 py-8 sm:py-12">

                    {/* Page heading */}
                    <div className="mb-6 flex flex-col gap-1">
                        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                            Profile
                        </h1>
                        <p className="text-sm text-slate-500">
                            Review how your profile details appear.
                        </p>
                    </div>

                    <Card className="overflow-hidden border-slate-200 shadow-sm">

                        {/* Identity block */}
                        <CardHeader className="pb-4 pt-6">
                            <CardTitle className="text-xl text-slate-900 sm:text-2xl">
                                {mentee?.group_name}
                            </CardTitle>
                            <CardDescription className="text-sm text-slate-500">
                                Thesis Group
                            </CardDescription>
                        </CardHeader>

                        <div className="h-px w-full bg-slate-100" />

                        <CardContent className="space-y-8 pt-6">
                            {/* Research details */}
                            <section className="space-y-4">
                                <h2 className="text-sm font-semibold text-slate-900">
                                    Research Details
                                </h2>

                                <ProfileField
                                    icon={<BookText className="h-4 w-4" />}
                                    label="Research Title"
                                    value={mentee?.research_title ? mentee?.research_title : "Loading..."}
                                />
                                <ProfileField
                                    icon={<BookText className="h-4 w-4" />}
                                    label="Research Description"
                                    value={mentee?.research_description ? mentee?.research_description : "Loading..."}
                                />
                                <ProfileField
                                    icon={<Star className="h-4 w-4" />}
                                    label="Mentor Preference"
                                    value={mentee?.mentor_preference ? mentee?.mentor_preference : "Loading..."}
                                />
                                <ProfileField
                                    icon={<Calendar className="h-4 w-4" />}
                                    label="Available Days"
                                    value={mentee?.available_days ? mentee?.available_days.join(", ") : "Loading..."}
                                />
                                <ProfileField
                                    icon={<Clock className="h-4 w-4" />}
                                    label="Time Slot"
                                    value={mentee?.time_slot?.map((encoded: string) => {
                                        const { day, slot } = parseSlot(encoded)
                                        return (
                                            <span key={encoded} className="text-sm block">
                                                <span className="font-medium">{day}:</span> {slot}
                                            </span>
                                        )
                                    })}
                                />
                            </section>

                            <div className="h-px w-full bg-slate-100" />

                            {/* Group members */}
                            <section className="space-y-3">
                                <h2 className="text-sm font-semibold text-slate-900">
                                    Group Members
                                </h2>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {mentee?.group_members.map((member: string, i: number) => {
                                        const parsed = JSON.parse(member)
                                        return (
                                            <DetailRow icon={<UserRound className="h-4 w-4" />} key={i} stud_no={parsed.student_number} label={`Member ${i + 1}`} value={parsed.name} href="" />
                                        )
                                    })}


                                </div>

                            </section>
                        </CardContent>
                        <CardFooter className="flex justify-end border-t border-slate-100 pt-4">
                            <Button className="w-full sm:w-auto" onClick={goEditProfile}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit Profile
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </main>
        </div>
    );
}
