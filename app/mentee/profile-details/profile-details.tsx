"use client";

import Sidebar from "@/components/ui/Sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    BookText, Clock, Calendar, Star, Pencil,
    UserRound, Users, MessageSquare, GraduationCap, Crown
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMentee } from "@/app/context/menteeContext";
import { parseSlot } from "@/components/ui/AvailabilitySelector";

function InfoBlock({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
            <div className="text-sm text-slate-800">{children}</div>
        </div>
    )
}

export default function MenteeProfileDetails() {
    const router = useRouter()
    const { mentee, loading } = useMentee()

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
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-slate-500">Loading profile...</p>
            </div>
        </div>
    )

    const members: { name: string; student_number: string; is_leader?: boolean }[] =
        mentee?.group_members?.map((m: string) => {
            try { return JSON.parse(m) } catch { return { name: m, student_number: "" } }
        }) ?? []

    const timeSlots = mentee?.time_slot ?? []

    return (
        <div className="flex h-screen bg-slate-50">
            <Sidebar userType="mentee" userName={mentee?.group_name} />

            <div className="flex-1 overflow-auto">

                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 px-8 py-8 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl font-bold shrink-0">
                                {mentee?.group_name?.slice(0, 2).toUpperCase() ?? "GR"}
                            </div>
                            <div>
                                <p className="text-emerald-200 text-sm font-medium">Thesis Group</p>
                                <h1 className="text-2xl font-bold">{mentee?.group_name}</h1>
                                <p className="text-emerald-100 text-sm mt-0.5 max-w-md line-clamp-1">
                                    {mentee?.research_title ?? "No thesis title yet"}
                                </p>
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
                            <Users className="w-3.5 h-3.5 text-emerald-200" />
                            <span className="text-xs text-emerald-100">{members.length} member{members.length !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-lg px-3 py-1.5 flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-emerald-200" />
                            <span className="text-xs text-emerald-100">{(mentee?.available_days ?? []).length} available day{(mentee?.available_days ?? []).length !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-lg px-3 py-1.5 flex items-center gap-2">
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-200" />
                            <span className="text-xs text-emerald-100">{commLabel(mentee?.communication_preference)}</span>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-5 max-w-4xl">

                    {/* Research Details */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
                            <BookText className="w-4 h-4 text-emerald-600" />
                            <h2 className="text-sm font-semibold text-slate-700">Research Details</h2>
                        </div>
                        <div className="p-5 space-y-5">
                            <InfoBlock label="Thesis Title">
                                <p className="font-medium text-slate-900">{mentee?.research_title || <span className="text-slate-400">Not provided</span>}</p>
                            </InfoBlock>

                            <div className="h-px bg-slate-100" />

                            <InfoBlock label="Research Description">
                                <p className="leading-relaxed text-slate-700 whitespace-pre-line">
                                    {mentee?.research_description || <span className="text-slate-400">Not provided</span>}
                                </p>
                            </InfoBlock>

                            <div className="h-px bg-slate-100" />

                            <InfoBlock label="Mentor Preference">
                                <p className="leading-relaxed text-slate-700">
                                    {mentee?.mentor_preference || <span className="text-slate-400">Not provided</span>}
                                </p>
                            </InfoBlock>
                        </div>
                    </div>

                    {/* Availability */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
                            <Calendar className="w-4 h-4 text-emerald-600" />
                            <h2 className="text-sm font-semibold text-slate-700">Availability</h2>
                        </div>
                        <div className="p-5 grid sm:grid-cols-2 gap-5">
                            <InfoBlock label="Available Days">
                                {(mentee?.available_days ?? []).length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                        {mentee!.available_days.map((day: string) => (
                                            <Badge key={day} variant="outline" className="text-xs border-emerald-200 text-emerald-700 bg-emerald-50">
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

                    {/* Group Members */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
                            <Users className="w-4 h-4 text-emerald-600" />
                            <h2 className="text-sm font-semibold text-slate-700">Group Members</h2>
                            <span className="ml-auto text-xs text-slate-400">{members.length} member{members.length !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="p-5">
                            {members.length === 0 ? (
                                <div className="text-center py-8 text-slate-400">
                                    <GraduationCap className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                                    <p className="text-sm">No members listed.</p>
                                </div>
                            ) : (
                                <div className="grid sm:grid-cols-2 gap-3">
                                    {members.map((member, i) => (
                                        <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${member.is_leader ? "border-amber-200 bg-amber-50 hover:bg-amber-100" : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"}`}>
                                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                {member.name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() || "?"}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-slate-900 truncate flex items-center gap-1.5">
                                                    {member.name || "—"}
                                                    {member.is_leader && <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                                                </p>
                                                {member.student_number && (
                                                    <p className="text-xs text-slate-400">{member.student_number}</p>
                                                )}
                                            </div>
                                            <span className="ml-auto text-xs text-slate-400 shrink-0">
                                                {member.is_leader ? "Leader" : `Member ${i + 1}`}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
