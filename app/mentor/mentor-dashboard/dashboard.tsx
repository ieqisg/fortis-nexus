"use client";
import MyMentees from "./my-mentees";
import ProgressMentees from "./progress-mentee";
import SubmittedPapers from "./submitted-papers";
import Meeting from "./meeting";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Sidebar from "@/components/ui/Sidebar";
import { useMentor } from "@/app/context/mentorContext";
import { Users, TrendingUp, FileText, CalendarDays, CheckCircle2, Clock } from "lucide-react";

export default function MentorDashboard() {
    const { mentor, loading, meetings, papers } = useMentor()

    const matchCount = mentor?.matches?.length ?? 0
    const reviewedCount = papers.filter(p => p.status === "reviewed").length
    const pendingCount = papers.filter(p => p.status === "pending").length

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-slate-50">
            <div className="text-center space-y-3">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-slate-500">Loading your dashboard...</p>
            </div>
        </div>
    )

    return (
        <div className="flex h-screen bg-slate-50">
            <Sidebar userType="mentor" userName={`${mentor?.first_name ?? ""} ${mentor?.last_name ?? ""}`.trim() || "Loading"} />

            <div className="flex-1 overflow-auto">

                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-8 py-8 text-white">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-blue-200 text-sm font-medium mb-1">Welcome back</p>
                            <h1 className="text-3xl font-bold">
                                {`${mentor?.first_name ?? ""} ${mentor?.last_name ?? ""}`.trim() || "Mentor"}
                            </h1>
                            <p className="text-blue-100 text-sm mt-1">{mentor?.email}</p>
                        </div>
                        <div className="flex gap-4">
                            <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-3 text-center min-w-[80px]">
                                <p className="text-2xl font-bold">{matchCount}</p>
                                <p className="text-xs text-blue-100">Mentees</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-3 text-center min-w-[80px]">
                                <p className="text-2xl font-bold">{papers.length}</p>
                                <p className="text-xs text-blue-100">Papers</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-3 text-center min-w-[80px]">
                                <p className="text-2xl font-bold">{reviewedCount}</p>
                                <p className="text-xs text-blue-100">Reviewed</p>
                            </div>
                        </div>
                    </div>

                    {/* Quick stats row */}
                    <div className="flex gap-3 mt-5">
                        <div className="bg-white/10 backdrop-blur rounded-lg px-3 py-1.5 flex items-center gap-2">
                            <Users className="w-3.5 h-3.5 text-blue-200" />
                            <span className="text-xs text-blue-100">
                                {matchCount} / {mentor?.mentor_capacity ?? "?"} capacity
                            </span>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-lg px-3 py-1.5 flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-200" />
                            <span className="text-xs text-blue-100">{reviewedCount} reviewed</span>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-lg px-3 py-1.5 flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-blue-200" />
                            <span className="text-xs text-blue-100">{pendingCount} pending</span>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="p-6">
                    <Tabs defaultValue="mentees" className="space-y-5">
                        <TabsList className="bg-white border border-slate-200 shadow-sm p-1 h-auto gap-1 flex flex-wrap">
                            <TabsTrigger
                                value="mentees"
                                className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-md px-4 py-2 text-sm"
                            >
                                <Users className="w-4 h-4" /> My Mentees
                                {matchCount > 0 && (
                                    <span className="bg-blue-100 text-blue-700 data-[state=active]:bg-white/20 data-[state=active]:text-white text-xs px-1.5 py-0.5 rounded-full">
                                        {matchCount}
                                    </span>
                                )}
                            </TabsTrigger>
                            <TabsTrigger
                                value="progress"
                                className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-md px-4 py-2 text-sm"
                            >
                                <TrendingUp className="w-4 h-4" /> Progress Tracking
                            </TabsTrigger>
                            <TabsTrigger
                                value="papers"
                                className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-md px-4 py-2 text-sm"
                            >
                                <FileText className="w-4 h-4" /> Submitted Papers
                                {pendingCount > 0 && (
                                    <span className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full">
                                        {pendingCount}
                                    </span>
                                )}
                            </TabsTrigger>
                            <TabsTrigger
                                value="calendar"
                                className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-md px-4 py-2 text-sm"
                            >
                                <CalendarDays className="w-4 h-4" /> Calendar & Meetings
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="mentees" className="space-y-4 mt-0">
                            <MyMentees matches={mentor?.matches ?? []} />
                        </TabsContent>

                        <TabsContent value="progress" className="space-y-4 mt-0">
                            <ProgressMentees />
                        </TabsContent>

                        <TabsContent value="papers" className="space-y-4 mt-0">
                            <SubmittedPapers />
                        </TabsContent>

                        <TabsContent value="calendar" className="space-y-4 mt-0">
                            <div className="grid md:grid-cols-2 gap-5">
                                <Meeting matches={mentor?.matches ?? []} mentorTimeSlots={mentor?.time_slot ?? []} />
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
