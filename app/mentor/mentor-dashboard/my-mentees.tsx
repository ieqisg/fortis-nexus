"use client";

import { useEffect, useState } from "react";
import {
    Card,
    CardHeader,
    CardContent,
    CardDescription,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import MatchScoreCard from "@/components/ui/MatchScoreCard";
import { Matches } from "@/types/menteeTypes";
import { getMentorPreferences, type RankedMentee } from "@/lib/actions/mentorActions";
import { ChevronDown, ChevronUp, ListOrdered } from "lucide-react";

type Props = {
    matches: Matches[]
    mentorId: string
}

export default function MyMentees({ matches, mentorId }: Props) {
    const hasMatch = !!matches?.length
    const [rankingOpen, setRankingOpen] = useState(false)
    const [rankings, setRankings] = useState<RankedMentee[]>([])
    const [rankingsLoading, setRankingsLoading] = useState(false)

    const matchedIds = new Set(matches.map(m => m.mentee?.id))

    useEffect(() => {
        if (!mentorId) return
        setRankingsLoading(true)
        getMentorPreferences(mentorId).then(r => {
            if (r.success && r.data) setRankings(r.data)
            setRankingsLoading(false)
        })
    }, [mentorId])

    return (
        <>
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
                                        return (
                                            <div
                                                key={r.mentee_group_id}
                                                className={`flex items-center gap-4 rounded-xl px-4 py-3 border transition-colors ${
                                                    isMatch
                                                        ? "border-blue-300 bg-blue-50"
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
                    <Card key={match.mentee?.id}>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle>{match.mentee?.group_name}</CardTitle>
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
                            <div className="mt-4 pt-4 border-t">
                                <h4 className="font-semibold text-gray-900 mb-2">Group Members</h4>
                                <div className="flex flex-wrap gap-2">
                                    {match.mentee?.group_members?.map((member, i) => {
                                        const parsed = JSON.parse(member)
                                        return (
                                            <Badge key={i} variant="outline">
                                                {parsed.name} - {parsed.student_number}
                                            </Badge>
                                        )
                                    })}
                                </div>
                            </div>
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
