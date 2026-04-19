"use client";
import MyMentees from "./my-mentees";
import ProgressMentees from "./progress-mentee";
import SubmittedPapers from "./submitted-papers";
import Meeting from "./meeting";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Sidebar from "@/components/ui/Sidebar";
import { getMentorData } from "../lib/actions/mentorActions";
import { MentorWithMatch } from "../types/modelTypes";
import { useEffect, useState } from "react";

export default function MentorDashboard() {
    const [mentor, setMentor] = useState<MentorWithMatch | null>(null)
    const [loading, setLoading] = useState(true)
    const hasMatch = mentor?.matches


    useEffect(() => {
        const fetchData = async () => {
            const result = await getMentorData()
            if (result.success) {
                setMentor(result.data)
                console.log(result)
            } else {
                alert("No fetched Data")
            }
            setLoading(false)
        }
        fetchData()
    }, [])

    if (loading) return <p>Loading...</p>

    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar userType="mentor" userName={`${mentor?.first_name ?? ""} ${mentor?.last_name ?? ""}`.trim() ?? "Loading"} />

            <div className="flex-1 overflow-auto">
                <div className="bg-linear-to-r from-blue-600 to-indigo-600 text-white p-8">
                    <h1 className="text-3xl font-bold mb-2">Mentor Dashboard</h1>
                    <p className="text-blue-100">{`Welcome Back, ${mentor?.first_name ?? ""} ${mentor?.last_name ?? ""}`.trim() ?? "Loading"}</p>
                </div>

                <div className="p-8">
                    <Tabs defaultValue="mentees" className="space-y-6">
                        <TabsList className="grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                            <TabsTrigger value="mentees">My Mentees</TabsTrigger>
                            <TabsTrigger value="progress">Progress Tracking</TabsTrigger>
                            <TabsTrigger value="papers">Submitted Papers</TabsTrigger>
                            <TabsTrigger value="calendar">Calendar & Meetings</TabsTrigger>
                        </TabsList>

                        <TabsContent value="mentees" className="space-y-6">
                            <div className="grid gap-6">
                                <  MyMentees matches={mentor?.matches ?? []} />
                            </div>
                        </TabsContent>

                        <TabsContent value="progress" className="space-y-6">
                            <div className="grid gap-6">
                                <ProgressMentees />
                            </div>
                        </TabsContent>

                        <TabsContent value="papers" className="space-y-6">
                            {/* For logic later
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No papers submitted yet</p>
                </CardContent>
              </Card>
            */}
                            <div className="grid gap-6">
                                <SubmittedPapers />
                            </div>
                        </TabsContent>

                        <TabsContent value="calendar" className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <Meeting matches={mentor?.matches ?? []} />
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            {/* Add Meeting Dialog */}
        </div>
    );
}
