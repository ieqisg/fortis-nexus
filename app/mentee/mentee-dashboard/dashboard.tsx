"use client";

import Sidebar from "@/components/ui/Sidebar";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Upload, FileText, Calendar, Clock, RefreshCw,
    Download, MessageSquare, BookOpen, TrendingUp,
    User, Zap, CheckCircle2, Circle, GraduationCap,
    Target, AlertCircle, NotebookPen, LayoutDashboard
} from "lucide-react";
import { useRef, useState, useEffect } from "react";
import type { PrevMentoredThesis, Milestone, MentorAnnouncement } from "@/types/mentorTypes";
import { useMentee } from "@/app/context/menteeContext";
import { submitPaper, getPaperDownloadUrl } from "@/lib/actions/paperActions";
import { getAnnouncements, type Announcement } from "@/lib/actions/announcementActions";
import { getMenteePreferences, type RankedMentor } from "@/lib/actions/menteeActions";
import { getMentorAnnouncements } from "@/lib/actions/mentorAnnouncementActions";
import { getMilestonesForCurrentMentee } from "@/lib/actions/milestoneActions";
import { Megaphone, X, ChevronDown, ChevronUp, ListOrdered } from "lucide-react";
import { toast } from "sonner";

export default function MenteeDashboard() {
    const { mentee, loading, meeting, meetingLoading, papers, papersLoading, setPapers } = useMentee()
    const [submitting, setSubmitting] = useState(false)
    const [paperSubTab, setPaperSubTab] = useState<"submit" | "papers">("submit")
    const formRef = useRef<HTMLFormElement>(null)
    const [announcements, setAnnouncements] = useState<Announcement[]>([])
    const [mentorAnnouncements, setMentorAnnouncements] = useState<MentorAnnouncement[]>([])
    const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
    const [rankingOpen, setRankingOpen] = useState(false)
    const [rankings, setRankings] = useState<RankedMentor[]>([])
    const [rankingsLoading, setRankingsLoading] = useState(false)
    const [milestones, setMilestones] = useState<Milestone[]>([])
    const [fileError, setFileError] = useState<string | null>(null)

    useEffect(() => {
        getAnnouncements("mentee").then(r => { if (r.success) setAnnouncements(r.data) })
        getMentorAnnouncements().then(r => { if (r.success) setMentorAnnouncements(r.data) })
        getMilestonesForCurrentMentee().then(r => { if (r.success) setMilestones(r.data) })
    }, [])

    useEffect(() => {
        if (!mentee?.id) return
        async function load() {
            setRankingsLoading(true)
            const r = await getMenteePreferences(mentee!.id)
            if (r.success && r.data) setRankings(r.data)
            setRankingsLoading(false)
        }
        load()
    }, [mentee?.id])

    const visibleAnnouncements = announcements.filter(a => !dismissedIds.has(a.id))
    const visibleMentorAnnouncements = mentorAnnouncements.filter(a => !dismissedIds.has(a.id))

    const hasMatch = !!mentee?.matches
    const matches = mentee?.matches
    const scorePercentage = Math.round((matches?.compatibility_score ?? 0) * 100)
    const reviewedCount = papers.filter(p => p.status === "reviewed").length
    const hasPendingPaper = papers.some(p => p.status === "pending")
    const pendingMilestones = milestones.filter(m => !m.completed).length

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file && file.size > 5 * 1024 * 1024) {
            setFileError("File exceeds the 5 MB limit. Please choose a smaller file.")
            e.target.value = ""
        } else {
            setFileError(null)
        }
    }

    const handleSubmitPaper = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        if (!formData.get("title")) return
        setSubmitting(true)
        const result = await submitPaper(formData)
        if (result.success && result.paper) {
            setPapers(prev => [result.paper!, ...prev])
            toast.success("Paper submitted successfully")
            formRef.current?.reset()
            setPaperSubTab("papers")
        } else {
            toast.error(result.message ?? "Failed to submit paper")
        }
        setSubmitting(false)
    }

    const handleDownload = async (filePath: string, fileName: string) => {
        const result = await getPaperDownloadUrl(filePath)
        if (result.url) {
            const a = document.createElement("a")
            a.href = result.url
            a.download = fileName
            a.click()
        }
    }

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-slate-50">
            <div className="text-center space-y-3">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-slate-500">Loading your dashboard...</p>
            </div>
        </div>
    )

    return (
        <div className="flex h-screen bg-slate-50">
            <Sidebar userType="mentee" userName={mentee?.group_name ?? "Loading..."} />

            <div className="flex-1 overflow-auto">

                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 pl-16 pr-4 sm:px-8 py-6 sm:py-8 text-white">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div>
                            <p className="text-emerald-200 text-sm font-medium mb-1">Welcome back</p>
                            <h1 className="text-2xl sm:text-3xl font-bold">{mentee?.group_name ?? "..."}</h1>
                            <p className="text-emerald-100 text-sm mt-1 line-clamp-1">{mentee?.research_title ?? ""}</p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-3 text-center min-w-[72px]">
                                <p className="text-2xl font-bold">{papers.length}</p>
                                <p className="text-xs text-emerald-100">Papers</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-3 text-center min-w-[72px]">
                                <p className="text-2xl font-bold">{reviewedCount}</p>
                                <p className="text-xs text-emerald-100">Reviewed</p>
                            </div>
                            {hasMatch && (
                                <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-3 text-center min-w-[72px]">
                                    <p className="text-2xl font-bold">{scorePercentage}%</p>
                                    <p className="text-xs text-emerald-100">Match</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Announcements */}
                {(visibleAnnouncements.length > 0 || visibleMentorAnnouncements.length > 0) && (
                    <div className="px-6 pt-4 space-y-2">
                        {visibleAnnouncements.map(a => (
                            <div key={a.id} className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                                <Megaphone className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-emerald-900">{a.title}</p>
                                    <p className="text-sm text-emerald-800 mt-0.5">{a.body}</p>
                                </div>
                                <button
                                    onClick={() => setDismissedIds(prev => new Set(prev).add(a.id))}
                                    className="text-emerald-400 hover:text-emerald-600 transition-colors shrink-0"
                                    aria-label="Dismiss"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        {visibleMentorAnnouncements.map(a => (
                            <div key={a.id} className="flex items-start gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
                                <Megaphone className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-semibold text-indigo-900">{a.title}</p>
                                        <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-medium">From your mentor</span>
                                    </div>
                                    <p className="text-sm text-indigo-800 mt-0.5">{a.body}</p>
                                </div>
                                <button
                                    onClick={() => setDismissedIds(prev => new Set(prev).add(a.id))}
                                    className="text-indigo-300 hover:text-indigo-500 transition-colors shrink-0"
                                    aria-label="Dismiss"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Main Tabs */}
                <div className="p-4 sm:p-6">
                    <Tabs defaultValue="dashboard" className="space-y-5">
                        <div className="overflow-x-auto -mx-1 px-1 pb-1">
                            <TabsList className="bg-white border border-slate-200 shadow-sm p-1 h-auto gap-1 flex flex-nowrap w-max min-w-full">
                                <TabsTrigger
                                    value="dashboard"
                                    className="flex items-center gap-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-md px-3 py-2 text-sm whitespace-nowrap"
                                >
                                    <LayoutDashboard className="w-4 h-4 shrink-0" /> Dashboard
                                </TabsTrigger>
                                <TabsTrigger
                                    value="papers"
                                    className="flex items-center gap-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-md px-3 py-2 text-sm whitespace-nowrap"
                                >
                                    <FileText className="w-4 h-4 shrink-0" /> Paper Submission
                                    {hasPendingPaper && (
                                        <span className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full">
                                            Pending
                                        </span>
                                    )}
                                </TabsTrigger>
                                <TabsTrigger
                                    value="milestones"
                                    className="flex items-center gap-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-md px-3 py-2 text-sm whitespace-nowrap"
                                >
                                    <Target className="w-4 h-4 shrink-0" /> Tasks &amp; Milestones
                                    {pendingMilestones > 0 && (
                                        <span className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">
                                            {pendingMilestones}
                                        </span>
                                    )}
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        {/* Dashboard Tab */}
                        <TabsContent value="dashboard" className="space-y-6 mt-0">

                            {/* Top row: Mentor + right column */}
                            <div className="grid lg:grid-cols-3 gap-5">

                                {/* Mentor Card */}
                                <div className="lg:col-span-2">
                                    {matches ? (
                                        <Card className="h-full border-0 shadow-sm">
                                            <CardHeader className="pb-3 border-b border-slate-100">
                                                <div className="flex items-center justify-between">
                                                    <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
                                                        <User className="w-4 h-4 text-emerald-600" />
                                                        Your Matched Mentor
                                                    </CardTitle>
                                                    <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">
                                                        Matched
                                                    </Badge>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="pt-4 space-y-4">
                                                {/* Mentor identity */}
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                                                        {(matches.mentor?.first_name?.[0] ?? "") + (matches.mentor?.last_name?.[0] ?? "")}
                                                    </div>
                                                    <div>
                                                        <h3 className="text-lg font-bold text-slate-900">
                                                            {matches.mentor?.first_name} {matches.mentor?.last_name}
                                                        </h3>
                                                        <p className="text-sm text-slate-500">{matches.mentor?.email}</p>
                                                    </div>
                                                </div>

                                                {/* Match score inline */}
                                                <div className="bg-slate-50 rounded-lg p-3">
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                                                            <TrendingUp className="w-3 h-3" /> Compatibility
                                                        </span>
                                                        <span className="text-sm font-bold text-emerald-600">{scorePercentage}%</span>
                                                    </div>
                                                    <div className="w-full bg-slate-200 rounded-full h-1.5">
                                                        <div
                                                            className="bg-emerald-500 h-1.5 rounded-full"
                                                            style={{ width: `${scorePercentage}%` }}
                                                        />
                                                    </div>
                                                    {matches.matched_keywords && matches.matched_keywords.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-2">
                                                            {matches.matched_keywords.map((kw: string, i: number) => (
                                                                <span key={i} className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                                                                    {kw}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Forte & Skills */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <div>
                                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Expertise</p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {matches.mentor?.forte.map((f: string, i: number) => (
                                                                <Badge key={i} variant="outline" className="text-xs border-blue-200 text-blue-700 bg-blue-50">
                                                                    {f}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Skills</p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {matches.mentor?.technical_skills.slice(0, 4).map((s: string, i: number) => (
                                                                <Badge key={i} variant="outline" className="text-xs border-slate-200 text-slate-600">
                                                                    {s}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* About */}
                                                {matches.mentor?.self_description && (
                                                    <div>
                                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">About</p>
                                                        <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
                                                            {matches.mentor.self_description}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Prev Theses */}
                                                {matches.mentor?.prev_mentored_thesis &&
                                                    (matches.mentor.prev_mentored_thesis as PrevMentoredThesis[]).length > 0 && (
                                                        <div>
                                                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                                                                <BookOpen className="w-3 h-3" /> Previously Mentored Theses
                                                            </p>
                                                            <div className="overflow-x-auto rounded-lg border border-slate-200">
                                                                <table className="w-full text-xs">
                                                                    <thead className="bg-slate-50 text-slate-500">
                                                                        <tr>
                                                                            <th className="px-3 py-2 text-left font-medium">No.</th>
                                                                            <th className="px-3 py-2 text-left font-medium">Title</th>
                                                                            <th className="px-3 py-2 text-left font-medium">Adviser</th>
                                                                            <th className="px-3 py-2 text-left font-medium">Year</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-100">
                                                                        {(matches.mentor.prev_mentored_thesis as PrevMentoredThesis[]).map((t, i) => (
                                                                            <tr key={i} className="hover:bg-slate-50">
                                                                                <td className="px-3 py-2 text-slate-400">{t.title_no}</td>
                                                                                <td className="px-3 py-2 text-slate-800 font-medium">{t.title}</td>
                                                                                <td className="px-3 py-2 text-slate-500">{t.mentor}</td>
                                                                                <td className="px-3 py-2 text-slate-400">{t.year}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    )}
                                            </CardContent>
                                        </Card>
                                    ) : (
                                        <Card className="h-full border-0 shadow-sm border-dashed border-2 border-slate-200 bg-white">
                                            <CardContent className="flex flex-col items-center justify-center h-full py-16 text-center">
                                                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                                                    <GraduationCap className="w-7 h-7 text-slate-400" />
                                                </div>
                                                <h3 className="font-semibold text-slate-700 mb-1">No mentor assigned yet</h3>
                                                <p className="text-sm text-slate-400 max-w-xs">
                                                    The matching process is in progress. You&apos;ll be notified once a mentor is assigned.
                                                </p>
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>

                                {/* Right column: Meeting + Availability + Progress */}
                                <div className="space-y-5">
                                    {/* Meeting Card */}
                                    <Card className="border-0 shadow-sm">
                                        <CardHeader className="pb-3 border-b border-slate-100">
                                            <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
                                                <RefreshCw className="w-4 h-4 text-emerald-600" />
                                                Weekly Meeting
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-4">
                                            {meetingLoading ? (
                                                <div className="h-12 bg-slate-100 rounded animate-pulse" />
                                            ) : meeting ? (
                                                <div className="space-y-3">
                                                    <p className="font-semibold text-slate-900">{meeting.title}</p>
                                                    <div className="space-y-1.5">
                                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                                            <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
                                                            Every <strong>{meeting.recurrence_day}</strong>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                                            <Clock className="w-4 h-4 text-emerald-500 shrink-0" />
                                                            <strong>{meeting.recurrence_time}</strong>
                                                        </div>
                                                    </div>
                                                    {meeting.description && (
                                                        <p className="text-xs text-slate-500 bg-slate-50 rounded px-2 py-1.5">{meeting.description}</p>
                                                    )}
                                                    <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Recurring</Badge>
                                                    {meeting.notes && (
                                                        <div className="mt-2 bg-slate-50 rounded-lg px-3 py-2">
                                                            <p className="text-xs font-semibold text-slate-500 flex items-center gap-1 mb-1">
                                                                <NotebookPen className="w-3 h-3" /> Meeting Notes
                                                            </p>
                                                            <p className="text-xs text-slate-600 whitespace-pre-wrap">{meeting.notes}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="text-center py-4">
                                                    <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                                    <p className="text-xs text-slate-400">No meeting scheduled yet. Your mentor will set this up.</p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>

                                    {/* Mentor Availability */}
                                    {matches?.mentor && (matches.mentor.available_days?.length > 0 || matches.mentor.time_slot?.length > 0) && (
                                        <Card className="border-0 shadow-sm">
                                            <CardHeader className="pb-3 border-b border-slate-100">
                                                <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-emerald-600" />
                                                    Mentor Availability
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="pt-4 space-y-3">
                                                {matches.mentor.available_days?.length > 0 && (
                                                    <div>
                                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Available Days</p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {matches.mentor.available_days.map((day: string) => (
                                                                <Badge key={day} variant="outline" className="text-xs border-emerald-200 text-emerald-700 bg-emerald-50">
                                                                    {day}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {matches.mentor.time_slot?.length > 0 && (
                                                    <div>
                                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Time Slots</p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {matches.mentor.time_slot.map((slot: string) => (
                                                                <span key={slot} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                                                                    {slot}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* Paper Progress */}
                                    <Card className="border-0 shadow-sm">
                                        <CardHeader className="pb-3 border-b border-slate-100">
                                            <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
                                                <Zap className="w-4 h-4 text-amber-500" />
                                                Paper Progress
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-4 space-y-3">
                                            {papersLoading ? (
                                                <div className="h-16 bg-slate-100 rounded animate-pulse" />
                                            ) : papers.length === 0 ? (
                                                <div className="text-center py-4">
                                                    <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                                    <p className="text-xs text-slate-400">No papers submitted yet.</p>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex items-end justify-between">
                                                        <span className="text-3xl font-bold text-slate-900">{reviewedCount}<span className="text-lg text-slate-400">/{papers.length}</span></span>
                                                        <span className="text-xs text-slate-500 mb-1">reviewed</span>
                                                    </div>
                                                    <div className="w-full bg-slate-100 rounded-full h-2">
                                                        <div
                                                            className="bg-amber-400 h-2 rounded-full transition-all"
                                                            style={{ width: `${papers.length > 0 ? (reviewedCount / papers.length) * 100 : 0}%` }}
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                                                        {papers.map(p => (
                                                            <div key={p.id} className="flex items-center gap-2">
                                                                {p.status === "reviewed"
                                                                    ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                                                    : <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                                                                }
                                                                <span className={`text-xs truncate ${p.status === "reviewed" ? "text-slate-400 line-through" : "text-slate-700"}`}>
                                                                    {p.title}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>

                            {/* Mentor Rankings */}
                            {rankings.length > 0 && (
                                <Card className="border-0 shadow-sm">
                                    <button
                                        onClick={() => setRankingOpen(v => !v)}
                                        className="w-full flex items-center justify-between px-6 py-4 border-b border-slate-100 hover:bg-slate-50 transition-colors"
                                    >
                                        <span className="text-base font-semibold text-slate-700 flex items-center gap-2">
                                            <ListOrdered className="w-4 h-4 text-emerald-600" />
                                            Your Mentor Rankings
                                            <span className="text-xs font-normal text-slate-400 ml-1">
                                                ({rankings.length} mentors ranked by compatibility)
                                            </span>
                                        </span>
                                        {rankingOpen
                                            ? <ChevronUp className="w-4 h-4 text-slate-400" />
                                            : <ChevronDown className="w-4 h-4 text-slate-400" />
                                        }
                                    </button>

                                    {rankingOpen && (
                                        <CardContent className="pt-4">
                                            {rankingsLoading ? (
                                                <div className="space-y-2">
                                                    {[1, 2, 3].map(i => (
                                                        <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                                                    {rankings.map((r) => {
                                                        const isMatch = r.mentor_id === matches?.mentor?.id
                                                        const pct = Math.round(r.score * 100)
                                                        return (
                                                            <div
                                                                key={r.mentor_id}
                                                                className={`flex items-center gap-4 rounded-xl px-4 py-3 border transition-colors ${isMatch
                                                                    ? "border-emerald-300 bg-emerald-50"
                                                                    : "border-slate-100 bg-white hover:border-slate-200"
                                                                    }`}
                                                            >
                                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${r.rank === 1
                                                                    ? "bg-amber-100 text-amber-700"
                                                                    : r.rank <= 3
                                                                        ? "bg-slate-100 text-slate-600"
                                                                        : "bg-slate-50 text-slate-400"
                                                                    }`}>
                                                                    #{r.rank}
                                                                </div>
                                                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                                    {r.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <span className="text-sm font-semibold text-slate-800">{r.name}</span>
                                                                        {isMatch && (
                                                                            <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">
                                                                                Your Match
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {r.matched_keywords.length > 0 && (
                                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                                            {r.matched_keywords.map((kw, i) => (
                                                                                <span key={i} className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                                                                                    {kw}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="hidden sm:block w-28 shrink-0">
                                                                    <div className="flex items-center justify-between mb-1">
                                                                        <span className="text-xs text-slate-400">Match</span>
                                                                        <span className={`text-xs font-bold ${isMatch ? "text-emerald-600" : "text-slate-600"}`}>
                                                                            {pct}%
                                                                        </span>
                                                                    </div>
                                                                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                                                                        <div
                                                                            className={`h-1.5 rounded-full ${isMatch ? "bg-emerald-500" : "bg-slate-300"}`}
                                                                            style={{ width: `${pct}%` }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </CardContent>
                                    )}
                                </Card>
                            )}
                        </TabsContent>

                        {/* Paper Submission Tab */}
                        <TabsContent value="papers" className="mt-0">
                            <Card className="border-0 shadow-sm">
                                <div className="flex flex-wrap border-b border-slate-100">
                                    <button
                                        onClick={() => setPaperSubTab("submit")}
                                        className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${paperSubTab === "submit"
                                            ? "border-emerald-500 text-emerald-600"
                                            : "border-transparent text-slate-500 hover:text-slate-700"
                                            }`}
                                    >
                                        <Upload className="w-4 h-4" />
                                        Submit Paper
                                    </button>
                                    <button
                                        onClick={() => setPaperSubTab("papers")}
                                        className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${paperSubTab === "papers"
                                            ? "border-emerald-500 text-emerald-600"
                                            : "border-transparent text-slate-500 hover:text-slate-700"
                                            }`}
                                    >
                                        <FileText className="w-4 h-4" />
                                        My Submissions
                                        {papers.length > 0 && (
                                            <span className="bg-slate-100 text-slate-600 text-xs px-1.5 py-0.5 rounded-full">{papers.length}</span>
                                        )}
                                    </button>
                                </div>

                                <CardContent className="pt-5">
                                    {paperSubTab === "submit" ? (
                                        hasPendingPaper ? (
                                            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-4 max-w-lg">
                                                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-sm font-semibold text-amber-900">Paper awaiting review</p>
                                                    <p className="text-sm text-amber-700 mt-0.5">
                                                        You have a submission currently under review. You can upload a new paper once your mentor has reviewed the current one.
                                                    </p>
                                                    <button onClick={() => setPaperSubTab("papers")} className="text-xs text-amber-600 hover:underline mt-2 font-medium">
                                                        View current submission →
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <form ref={formRef} onSubmit={handleSubmitPaper} className="max-w-lg space-y-4">
                                                <div>
                                                    <Label htmlFor="paperTitle" className="text-sm font-medium text-slate-700">Paper Title <span className="text-red-400">*</span></Label>
                                                    <Input
                                                        id="paperTitle"
                                                        name="title"
                                                        placeholder="e.g., Chapter 1: Introduction"
                                                        className="mt-1"
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <Label htmlFor="paperFile" className="text-sm font-medium text-slate-700">Attach File <span className="text-slate-400 font-normal">(optional)</span></Label>
                                                    <Input
                                                        id="paperFile"
                                                        name="file"
                                                        type="file"
                                                        accept=".pdf,.doc,.docx"
                                                        className="mt-1"
                                                        onChange={handleFileChange}
                                                    />
                                                    <p className="text-xs text-slate-400 mt-1">Accepted: PDF, DOC, DOCX · Max 5 MB</p>
                                                    {fileError && (
                                                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                                            <AlertCircle className="w-3 h-3" /> {fileError}
                                                        </p>
                                                    )}
                                                </div>
                                                <Button
                                                    type="submit"
                                                    disabled={submitting || !!fileError}
                                                    className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto"
                                                >
                                                    <Upload className="w-4 h-4 mr-2" />
                                                    {submitting ? "Submitting..." : "Submit for Review"}
                                                </Button>
                                            </form>
                                        )
                                    ) : (
                                        <>
                                            {papersLoading ? (
                                                <div className="space-y-3">
                                                    {[1, 2].map(i => <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />)}
                                                </div>
                                            ) : papers.length === 0 ? (
                                                <div className="text-center py-12 text-slate-400">
                                                    <FileText className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                                                    <p className="text-sm">No papers submitted yet.</p>
                                                    <button onClick={() => setPaperSubTab("submit")} className="text-xs text-emerald-600 hover:underline mt-1">
                                                        Submit your first paper
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                                                    {papers.map(paper => (
                                                        <div key={paper.id} className="border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors">
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="flex items-start gap-3 min-w-0">
                                                                    <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${paper.status === "reviewed" ? "bg-green-100" : "bg-amber-100"}`}>
                                                                        {paper.status === "reviewed"
                                                                            ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                                                                            : <Clock className="w-4 h-4 text-amber-600" />
                                                                        }
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <h4 className="font-semibold text-slate-900 truncate">{paper.title}</h4>
                                                                        <div className="flex items-center gap-3 mt-0.5">
                                                                            <span className="text-xs text-slate-400 flex items-center gap-1">
                                                                                <Calendar className="w-3 h-3" />
                                                                                {new Date(paper.submitted_at).toLocaleDateString()}
                                                                            </span>
                                                                            {paper.file_name && (
                                                                                <button
                                                                                    onClick={() => handleDownload(paper.file_path!, paper.file_name!)}
                                                                                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                                                                >
                                                                                    <Download className="w-3 h-3" />{paper.file_name}
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <Badge className={`shrink-0 text-xs border-0 ${paper.status === "reviewed" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                                                                    {paper.status === "reviewed" ? "Reviewed" : "Pending"}
                                                                </Badge>
                                                            </div>

                                                            {paper.paper_comments && paper.paper_comments.length > 0 && (
                                                                <div className="mt-3 bg-blue-50 rounded-lg p-3 space-y-2">
                                                                    <p className="text-xs font-semibold text-blue-800 flex items-center gap-1">
                                                                        <MessageSquare className="w-3 h-3" /> Mentor Feedback
                                                                    </p>
                                                                    {paper.paper_comments.map(c => (
                                                                        <div key={c.id} className="border-l-2 border-blue-300 pl-3">
                                                                            <p className="text-sm text-slate-700">{c.comment}</p>
                                                                            <p className="text-xs text-slate-400 mt-0.5">{new Date(c.created_at).toLocaleDateString()}</p>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Tasks & Milestones Tab */}
                        <TabsContent value="milestones" className="mt-0">
                            <Card className="border-0 shadow-sm">
                                <CardHeader className="pb-3 border-b border-slate-100">
                                    <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
                                        <Target className="w-4 h-4 text-blue-600" />
                                        Tasks &amp; Milestones
                                        <span className="text-xs font-normal text-slate-400 ml-1">set by your mentor</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    {milestones.length === 0 ? (
                                        <div className="text-center py-12 text-slate-400">
                                            <Target className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                                            <p className="text-sm">No milestones assigned yet.</p>
                                            <p className="text-xs mt-1">Your mentor will assign tasks and deadlines here.</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="space-y-2">
                                                {milestones.map(m => {
                                                    const today = new Date().toISOString().split("T")[0]
                                                    const isOverdue = !m.completed && m.due_date && m.due_date < today
                                                    return (
                                                        <div
                                                            key={m.id}
                                                            className={`flex items-start gap-3 rounded-xl px-4 py-3 border ${m.completed
                                                                ? "border-green-100 bg-green-50"
                                                                : isOverdue
                                                                    ? "border-red-100 bg-red-50"
                                                                    : "border-slate-100 bg-white"
                                                                }`}
                                                        >
                                                            {m.completed
                                                                ? <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                                                                : <Circle className="w-5 h-5 text-slate-300 shrink-0 mt-0.5" />
                                                            }
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className={`text-sm font-medium ${m.completed ? "line-through text-slate-400" : "text-slate-800"}`}>
                                                                        {m.title}
                                                                    </span>
                                                                    {m.completed && (
                                                                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Done</span>
                                                                    )}
                                                                    {isOverdue && (
                                                                        <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">Overdue</span>
                                                                    )}
                                                                    {!m.completed && m.due_date && !isOverdue && (
                                                                        <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                                                                            Due {new Date(m.due_date + "T00:00:00").toLocaleDateString()}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {m.description && (
                                                                    <p className="text-xs text-slate-400 mt-0.5">{m.description}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                            <p className="text-xs text-slate-400 text-right mt-3">
                                                {milestones.filter(m => m.completed).length}/{milestones.length} completed
                                            </p>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
