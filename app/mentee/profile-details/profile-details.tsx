"use client";
import { ProfileField } from "@/components/ui/ProfileFiled";
import Sidebar from "@/components/ui/Sidebar";
import { Button } from "@/components/ui/button";
import { UserDataProps } from "@/types/profile_types";
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
import { useEffect } from "react"; import { abort } from "process";

export default function MenteeProfileDetails({ menteeData }: UserDataProps) {

    const router = useRouter()
    const dataMentee = menteeData
    const goEditProfile = () => {
        router.push("./edit-profile/")
    }
    useEffect(() => {
        console.log(dataMentee)
    })
    return (
        <div className="flex h-screen bg-slate-50">
            <Sidebar userType="mentee" userName={dataMentee.group_name} />

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
                                {dataMentee.group_name}
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
                                    value={dataMentee.research_title ? dataMentee.research_title : "Loading..."}
                                />
                                <ProfileField
                                    icon={<BookText className="h-4 w-4" />}
                                    label="Research Description"
                                    value={dataMentee.research_description ? dataMentee.research_description : "Loading..."}
                                />
                                <ProfileField
                                    icon={<Star className="h-4 w-4" />}
                                    label="Mentor Preference"
                                    value={dataMentee.mentor_preference ? dataMentee.mentor_preference : "Loading..."}
                                />
                                <ProfileField
                                    icon={<Calendar className="h-4 w-4" />}
                                    label="Available Days"
                                    value={dataMentee.available_days ? dataMentee.available_days.join(", ") : "Loading..."}
                                />
                                <ProfileField
                                    icon={<Clock className="h-4 w-4" />}
                                    label="Time Slot"
                                    value={dataMentee.time_slot ? dataMentee.time_slot.join(", ") : "Loading..."}
                                />
                            </section>

                            <div className="h-px w-full bg-slate-100" />

                            {/* Group members */}
                            <section className="space-y-3">
                                <h2 className="text-sm font-semibold text-slate-900">
                                    Group Members
                                </h2>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {dataMentee.group_members.map((member: string, i: number) => {
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
