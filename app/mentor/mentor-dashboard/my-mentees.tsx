"use client";

import { useEffect, useState } from "react";
import {
    Card,
    CardHeader,
    CardContent,
    CardDescription,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import MatchScoreCard from "@/components/ui/MatchScoreCard";
import { Matches } from "@/types/menteeTypes";
import { getMentorPreferences, type RankedMentee } from "@/lib/actions/mentorActions";
import {
    ChevronDown, ChevronUp, ListOrdered,
    Users, BookText, Calendar, Clock, MessageSquare, GraduationCap, ExternalLink, Crown,
} from "lucide-react";
import { parseSlot } from "@/components/ui/AvailabilitySelector"
import { useMentor } from "@/app/context/mentorContext";

type Props = {
    matches: Matches[]
    mentorId: string
}

function commLabel(pref: string | null | undefined) {
    if (!pref) return "—"
    if (pref === "FACE_TO_FACE") return "Face to Face"
    if (pref === "ONLINE_CHAT") return "Online — Chat"
    if (pref === "ONLINE_CALL") return "Online — Call"
    return pref
}

function MenteeProfileModal({ match, open, onClose }: {
    match: Matches | null
    open: boolean
    onClose: () => void
}) {
    if (!match?.mentee) return null
    const mentee = match.mentee

    const members: { name: string; student_number: string; is_leader?: boolean }[] =
        (mentee.group_members ?? []).map((m: string) => {
            try { return JSON.parse(m) } catch { return { name: m, student_number: "" } }
        })

    const timeSlots = mentee.time_slot ?? []

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0">
                {/* Modal header */}
                <div className="bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 px-6 py-5 text-white rounded-t-lg">
                    <DialogHeader>
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-xl font-bold shrink-0">
                                {mentee.group_name?.slice(0, 2).toUpperCase() ?? "GR"}
                            </div>
                            <div className="min-w-0">
                                <p className="text-emerald-200 text-xs font-medium">Thesis Group</p>
                                <DialogTitle className="text-white text-xl font-bold leading-tight">
                                    {mentee.group_name}
                                </DialogTitle>
                                <p className="text-emerald-100 text-xs mt-0.5 truncate max-w-xs">
                                    {mentee.email}
                                </p>
                            </div>
                        </div>

                        {/* Quick stats */}
                        <div className="flex flex-wrap gap-2 mt-4">
                            <span className="bg-white/10 backdrop-blur rounded-lg px-2.5 py-1 flex items-center gap-1.5 text-xs text-emerald-100">
                                <Users className="w-3 h-3 text-emerald-200" />
                                {members.length} member{members.length !== 1 ? "s" : ""}
                            </span>
                            <span className="bg-white/10 backdrop-blur rounded-lg px-2.5 py-1 flex items-center gap-1.5 text-xs text-emerald-100">
                                <Calendar className="w-3 h-3 text-emerald-200" />
                                {(mentee.available_days ?? []).length} day{(mentee.available_days ?? []).length !== 1 ? "s" : ""}
                            </span>
                            <span className="bg-white/10 backdrop-blur rounded-lg px-2.5 py-1 flex items-center gap-1.5 text-xs text-emerald-100">
                                <MessageSquare className="w-3 h-3 text-emerald-200" />
                                {commLabel(mentee.communication_preference)}
                            </span>
                            <Badge className="bg-green-700/60 text-white border-0 text-xs">
                                {match.status}
                            </Badge>
                        </div>
                    </DialogHeader>
                </div>

                <div className="p-5 space-y-4">
                    {/* Compatibility */}
                    <MatchScoreCard
                        hasMatch
                        score={match.compatibility_score ?? 0}
                        keywords={match.matched_keywords ?? []}
                    />

                    {/* Research */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
                            <BookText className="w-4 h-4 text-emerald-600" />
                            <h3 className="text-sm font-semibold text-slate-700">Research Details</h3>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Thesis Title</p>
                                <p className="text-sm font-medium text-slate-900">{mentee.research_title || <span className="text-slate-400">Not provided</span>}</p>
                            </div>
                            {(mentee as any).research_description && (
                                <>
                                    <div className="h-px bg-slate-100" />
                                    <div>
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Research Description</p>
                                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                                            {(mentee as any).research_description}
                                        </p>
                                    </div>
                                </>
                            )}
                            {(mentee as any).mentor_preference && (
                                <>
                                    <div className="h-px bg-slate-100" />
                                    <div>
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Mentor Preference</p>
                                        <p className="text-sm text-slate-700 leading-relaxed">
                                            {(mentee as any).mentor_preference}
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Availability */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
                            <Calendar className="w-4 h-4 text-emerald-600" />
                            <h3 className="text-sm font-semibold text-slate-700">Availability</h3>
                        </div>
                        <div className="p-4 grid sm:grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Available Days</p>
                                {(mentee.available_days ?? []).length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                        {mentee.available_days.map((day: string) => (
                                            <Badge key={day} variant="outline" className="text-xs border-emerald-200 text-emerald-700 bg-emerald-50">
                                                {day}
                                            </Badge>
                                        ))}
                                    </div>
                                ) : <span className="text-sm text-slate-400">Not set</span>}
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Time Slots</p>
                                {timeSlots.length > 0 ? (
                                    <div className="space-y-1">
                                        {timeSlots.map((encoded: string) => {
                                            try {
                                                const { day, slot } = parseSlot(encoded)
                                                return (
                                                    <div key={encoded} className="flex items-center gap-2 text-sm text-slate-700">
                                                        <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                                        <span><span className="font-medium">{day}:</span> {slot}</span>
                                                    </div>
                                                )
                                            } catch {
                                                return <span key={encoded} className="text-xs text-slate-400">{encoded}</span>
                                            }
                                        })}
                                    </div>
                                ) : <span className="text-sm text-slate-400">Not set</span>}
                            </div>
                        </div>
                    </div>

                    {/* Group Members */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
                            <Users className="w-4 h-4 text-emerald-600" />
                            <h3 className="text-sm font-semibold text-slate-700">Group Members</h3>
                            <span className="ml-auto text-xs text-slate-400">{members.length} member{members.length !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="p-4">
                            {members.length === 0 ? (
                                <div className="text-center py-6 text-slate-400">
                                    <GraduationCap className="w-7 h-7 mx-auto mb-1.5 text-slate-200" />
                                    <p className="text-sm">No members listed.</p>
                                </div>
                            ) : (
                                <div className="grid sm:grid-cols-2 gap-2">
                                    {members.map((member, i) => (
                                        <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${member.is_leader ? "border-amber-200 bg-amber-50" : "border-slate-100 bg-slate-50"}`}>
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
                                                {member.is_leader ? "Leader" : `#${i + 1}`}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default function MyMentees({ matches, mentorId }: Props) {
    const { mentor } = useMentor()
    const hasMatch = !!matches?.length
    const [rankingOpen, setRankingOpen] = useState(false)
    const [rankings, setRankings] = useState<RankedMentee[]>([])
    const [rankingsLoading, setRankingsLoading] = useState(false)
    const [selectedMatch, setSelectedMatch] = useState<Matches | null>(null)

    const matchedIds = new Set(matches.map(m => m.mentee?.id))

    useEffect(() => {
        if (!mentorId) return
        async function load() {
            setRankingsLoading(true)
            const r = await getMentorPreferences(mentorId)
            if (r.success && r.data) setRankings(r.data)
            setRankingsLoading(false)
        }
        load()
    }, [mentorId])

    return (
        <>
            <MenteeProfileModal
                match={selectedMatch}
                open={!!selectedMatch}
                onClose={() => setSelectedMatch(null)}
            />

            {/* Mentee Rankings card */}
            {(rankings.length > 0 || rankingsLoading) && (
                <Card className="border-0 shadow-sm">
                    <button
                        onClick={() => setRankingOpen(v => !v)}
                        className="w-full flex items-center justify-between px-6 py-4 border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                        <span className="text-base font-semibold text-slate-700 flex items-center gap-2">
                            <ListOrdered className="w-4 h-4 text-blue-600" />
                            Mentee Rankings
                            <span className="text-xs font-normal text-slate-400 ml-1">
                                ({rankings.length} mentee groups ranked by compatibility)
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
                                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                                    {rankings.map((r) => {
                                        const isMatch = matchedIds.has(r.mentee_group_id)
                                        const pct = Math.round(r.score * 100)
                                        const linkedMatch = matches.find(m => m.mentee?.id === r.mentee_group_id)
                                        return (
                                            <div
                                                key={r.mentee_group_id}
                                                onClick={() => linkedMatch && setSelectedMatch(linkedMatch)}
                                                className={`flex items-center gap-4 rounded-xl px-4 py-3 border transition-colors ${
                                                    isMatch
                                                        ? "border-blue-300 bg-blue-50 cursor-pointer hover:bg-blue-100"
                                                        : "border-slate-100 bg-white hover:border-slate-200"
                                                }`}
                                            >
                                                {/* Rank badge */}
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                                    r.rank === 1
                                                        ? "bg-amber-100 text-amber-700"
                                                        : r.rank <= 3
                                                        ? "bg-slate-100 text-slate-600"
                                                        : "bg-slate-50 text-slate-400"
                                                }`}>
                                                    #{r.rank}
                                                </div>

                                                {/* Group info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-sm font-semibold text-slate-800">
                                                            {r.group_name}
                                                        </span>
                                                        {isMatch && (
                                                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
                                                                Your Mentee
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-400 truncate mt-0.5">{r.research_title}</p>
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

                                                {/* Score bar */}
                                                <div className="hidden sm:block w-28 shrink-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-xs text-slate-400">Match</span>
                                                        <span className={`text-xs font-bold ${isMatch ? "text-blue-600" : "text-slate-600"}`}>
                                                            {pct}%
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                                                        <div
                                                            className={`h-1.5 rounded-full ${isMatch ? "bg-blue-500" : "bg-slate-300"}`}
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                {isMatch && (
                                                    <ExternalLink className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </CardContent>
                    )}
                </Card>
            )}

            {/* Matched mentees */}
            {hasMatch ? (
                matches.map((match) => (
                    <Card
                        key={match.mentee?.id}
                        onClick={() => setSelectedMatch(match)}
                        className="cursor-pointer hover:shadow-md hover:border-blue-200 transition-all"
                    >
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        {match.mentee?.group_name}
                                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                                    </CardTitle>
                                    <CardDescription className="mt-2">
                                        <strong className="text-gray-600">Title: </strong>
                                        {match.mentee?.research_title}
                                    </CardDescription>
                                </div>
                                <Badge className="bg-green-100 text-green-800">{match.status}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <MatchScoreCard
                                hasMatch={hasMatch}
                                score={match.compatibility_score ?? 0}
                                keywords={match.matched_keywords ?? []}
                            />
                            {/* Match Criteria */}
                            {(() => {
                                const sharedDays = (match.mentee?.available_days ?? []).filter((d: string) =>
                                    (mentor?.available_days ?? []).includes(d))
                                const sharedSlots = (match.mentee?.time_slot ?? []).filter((s: string) =>
                                    (mentor?.time_slot ?? []).includes(s))
                                const commMatch = !!match.mentee?.communication_preference &&
                                    match.mentee.communication_preference === mentor?.communication_preference
                                return (
                                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Match Criteria</p>
                                        <div className="grid grid-cols-3 gap-2 text-xs">
                                            <div>
                                                <p className="text-slate-400 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" />Shared Days</p>
                                                {sharedDays.length > 0
                                                    ? <div className="flex flex-wrap gap-1">{sharedDays.map((d: string) => <span key={d} className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{d}</span>)}</div>
                                                    : <span className="text-slate-400 italic">None</span>}
                                            </div>
                                            <div>
                                                <p className="text-slate-400 mb-1 flex items-center gap-1"><MessageSquare className="w-3 h-3" />Comm.</p>
                                                <span className={`px-2 py-0.5 rounded-full font-medium ${commMatch ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                                    {commMatch ? "✓" : "✗"} {commLabel(match.mentee?.communication_preference)}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-slate-400 mb-1 flex items-center gap-1"><Clock className="w-3 h-3" />Slots</p>
                                                {sharedSlots.length > 0
                                                    ? <div className="flex flex-wrap gap-1">{sharedSlots.map((s: string) => <span key={s} className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{s}</span>)}</div>
                                                    : <span className="text-slate-400 italic">None</span>}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })()}

                            <div className="mt-4 pt-4 border-t">
                                <h4 className="font-semibold text-gray-900 mb-2">Group Members</h4>
                                <div className="flex flex-wrap gap-2">
                                    {match.mentee?.group_members?.map((member, i) => {
                                        try {
                                            const parsed = JSON.parse(member)
                                            return (
                                                <Badge
                                                    key={i}
                                                    variant="outline"
                                                    className={parsed.is_leader ? "border-amber-300 bg-amber-50 text-amber-800" : ""}
                                                >
                                                    {parsed.is_leader && <Crown className="w-3 h-3 mr-1 text-amber-500" />}
                                                    {parsed.name} - {parsed.student_number}
                                                </Badge>
                                            )
                                        } catch {
                                            return <Badge key={i} variant="outline">{member}</Badge>
                                        }
                                    })}
                                </div>
                            </div>
                            <p className="text-xs text-slate-400 mt-4 flex items-center gap-1">
                                <ExternalLink className="w-3 h-3" /> Click to view full profile
                            </p>
                        </CardContent>
                    </Card>
                ))
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>My Mentees</CardTitle>
                        <CardDescription>
                            Based on Gale-Shapley algorithm and semantic similarity
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <p>No mentees matched yet. The matching process is in progress.</p>
                    </CardContent>
                </Card>
            )}
        </>
    );
}
