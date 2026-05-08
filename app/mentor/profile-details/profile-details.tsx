"use client"

import Sidebar from "@/components/ui/Sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    BookText, Clock, Calendar, Pencil,
    Briefcase, MessageSquare, Users, Star
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMentor } from "@/app/context/mentorContext";
import { parseSlot } from "@/components/ui/AvailabilitySelector";
import type { PrevMentoredThesis } from "@/types/mentorTypes";

function InfoBlock({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
            <div className="text-sm text-slate-800">{children}</div>
        </div>
    )
}

export default function MentorProfileDetails() {
    const router = useRouter()
    const { mentor, loading } = useMentor()

    const commLabel = (pref: string | null | undefined) => {
        if (!pref) return "—"
        if (pref === "FACE_TO_FACE") return "Face to Face"
        if (pref === "ONLINE_CHAT") return "Online — Chat"
        if (pref === "ONLINE_CALL") return "Online — Call"
        return pref
    }

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-slate-50">
            <div className="text-center space-y-3">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-slate-500">Loading profile...</p>
            </div>
        </div>
    )

    const theses = (mentor?.prev_mentored_thesis ?? []) as PrevMentoredThesis[]
    const timeSlots = mentor?.time_slot ?? []

    return (
        <div className="flex h-screen bg-slate-50">
            <Sidebar userType="mentor" userName={`${mentor?.first_name} ${mentor?.last_name}`} />

            <div className="flex-1 overflow-auto">

                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-8 py-8 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl font-bold shrink-0">
                                {(mentor?.first_name?.[0] ?? "") + (mentor?.last_name?.[0] ?? "")}
                            </div>
                            <div>
                                <p className="text-blue-200 text-sm font-medium">Mentor</p>
                                <h1 className="text-2xl font-bold">{mentor?.first_name} {mentor?.last_name}</h1>
                                <p className="text-blue-100 text-sm mt-0.5">{mentor?.email}</p>
                            </div>
                        </div>
                        <Button
                            onClick={() => router.push("./edit-profile/")}
                            className="bg-white/15 hover:bg-white/25 text-white border-0 backdrop-blur"
                        >
                            <Pencil className="w-4 h-4 mr-2" /> Edit Profile
                        </Button>
                    </div>

                    {/* Quick stat pills */}
                    <div className="flex gap-3 mt-5">
                        <div className="bg-white/10 backdrop-blur rounded-lg px-3 py-1.5 flex items-center gap-2">
                            <Briefcase className="w-3.5 h-3.5 text-blue-200" />
                            <span className="text-xs text-blue-100">{mentor?.experience ?? 0} yrs experience</span>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-lg px-3 py-1.5 flex items-center gap-2">
                            <Users className="w-3.5 h-3.5 text-blue-200" />
                            <span className="text-xs text-blue-100">Capacity: {mentor?.mentor_capacity ?? "—"}</span>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-lg px-3 py-1.5 flex items-center gap-2">
                            <MessageSquare className="w-3.5 h-3.5 text-blue-200" />
                            <span className="text-xs text-blue-100">{commLabel(mentor?.communication_preference)}</span>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-lg px-3 py-1.5 flex items-center gap-2">
                            <BookText className="w-3.5 h-3.5 text-blue-200" />
                            <span className="text-xs text-blue-100">{theses.length} prev. theses</span>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-5 max-w-4xl">

                    {/* Profile Details */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
                            <Star className="w-4 h-4 text-blue-600" />
                            <h2 className="text-sm font-semibold text-slate-700">Profile Details</h2>
                        </div>
                        <div className="p-5 space-y-5">
                            <InfoBlock label="Self Description">
                                <p className="leading-relaxed text-slate-700 whitespace-pre-line">
                                    {mentor?.self_description || <span className="text-slate-400">Not provided</span>}
                                </p>
                            </InfoBlock>

                            <div className="h-px bg-slate-100" />

                            <div className="grid sm:grid-cols-2 gap-5">
                                <InfoBlock label="Forte / Specialization">
                                    {(mentor?.forte ?? []).length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                            {mentor!.forte!.map((f: string) => (
                                                <Badge key={f} variant="outline" className="text-xs border-indigo-200 text-indigo-700 bg-indigo-50">
                                                    {f}
                                                </Badge>
                                            ))}
                                        </div>
                                    ) : <span className="text-slate-400">Not set</span>}
                                </InfoBlock>

                                <InfoBlock label="Technical Skills">
                                    {(mentor?.technical_skills ?? []).length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                            {mentor!.technical_skills!.map((s: string) => (
                                                <Badge key={s} variant="outline" className="text-xs border-slate-200 text-slate-600">
                                                    {s}
                                                </Badge>
                                            ))}
                                        </div>
                                    ) : <span className="text-slate-400">Not set</span>}
                                </InfoBlock>
                            </div>
                        </div>
                    </div>

                    {/* Availability */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            <h2 className="text-sm font-semibold text-slate-700">Availability</h2>
                        </div>
                        <div className="p-5 grid sm:grid-cols-2 gap-5">
                            <InfoBlock label="Available Days">
                                {(mentor?.available_days ?? []).length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                        {mentor!.available_days!.map((day: string) => (
                                            <Badge key={day} variant="outline" className="text-xs border-blue-200 text-blue-700 bg-blue-50">
                                                {day}
                                            </Badge>
                                        ))}
                                    </div>
                                ) : <span className="text-slate-400">Not set</span>}
                            </InfoBlock>

                            <InfoBlock label="Time Slots">
                                {timeSlots.length > 0 ? (
                                    <div className="space-y-1 mt-1">
                                        {timeSlots.map((encoded: string) => {
                                            const { day, slot } = parseSlot(encoded)
                                            return (
                                                <div key={encoded} className="flex items-center gap-2 text-slate-700">
                                                    <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                                    <span><span className="font-medium">{day}:</span> {slot}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                ) : <span className="text-slate-400">Not set</span>}
                            </InfoBlock>
                        </div>
                    </div>

                    {/* Past Mentored Theses */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
                            <BookText className="w-4 h-4 text-blue-600" />
                            <h2 className="text-sm font-semibold text-slate-700">Past Mentored Theses</h2>
                            <span className="ml-auto text-xs text-slate-400">{theses.length} entr{theses.length !== 1 ? "ies" : "y"}</span>
                        </div>
                        <div className="p-5">
                            {theses.length > 0 ? (
                                <div className="overflow-x-auto rounded-lg border border-slate-200">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 text-slate-500">
                                            <tr>
                                                <th className="px-4 py-2.5 text-left font-medium">Title No.</th>
                                                <th className="px-4 py-2.5 text-left font-medium">Title</th>
                                                <th className="px-4 py-2.5 text-left font-medium">Mentor / Adviser</th>
                                                <th className="px-4 py-2.5 text-left font-medium">Year</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {theses.map((thesis, i) => (
                                                <tr key={i} className="hover:bg-slate-50">
                                                    <td className="px-4 py-2.5 text-slate-400">{thesis.title_no}</td>
                                                    <td className="px-4 py-2.5 text-slate-900 font-medium">{thesis.title}</td>
                                                    <td className="px-4 py-2.5 text-slate-600">{thesis.mentor}</td>
                                                    <td className="px-4 py-2.5 text-slate-400">{thesis.year}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-slate-400">
                                    <BookText className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                                    <p className="text-sm">No previously mentored theses listed.</p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
