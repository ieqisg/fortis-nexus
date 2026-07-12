"use client";

import Sidebar from "@/components/ui/Sidebar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText, Calendar, Clock,
  MessageSquare, BookOpen, TrendingUp,
  User, Zap, GraduationCap,
} from "lucide-react";
import { useState, useEffect } from "react";
import type { PrevMentoredThesis, MentorAnnouncement } from "@/types/mentorTypes";
import { useMentee } from "@/app/context/menteeContext";
import { getAnnouncements, type Announcement } from "@/lib/actions/announcementActions";
import type { RankedMentor } from "@/lib/actions/menteeActions";
import { getMentorAnnouncements } from "@/lib/actions/mentorAnnouncementActions";
import { Megaphone, X } from "lucide-react";

export default function MenteeDashboard() {
  const { mentee, loading, papers } = useMentee()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [mentorAnnouncements, setMentorAnnouncements] = useState<MentorAnnouncement[]>([])
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    getAnnouncements("mentee").then(r => { if (r.success) setAnnouncements(r.data) })
    getMentorAnnouncements().then(r => { if (r.success) setMentorAnnouncements(r.data) })
  }, [])

  const visibleAnnouncements = announcements.filter(a => !dismissedIds.has(a.id))
  const visibleMentorAnnouncements = mentorAnnouncements.filter(a => !dismissedIds.has(a.id))

  const matchRecord = mentee?.matches?.[0] ?? null
  const hasMatch = !!matchRecord
  const scorePercentage = Math.round((matchRecord?.compatibility_score ?? 0) * 100)
  const reviewedCount = papers.filter(p => p.status === "reviewed").length

  const commLabel = (p: string | null | undefined) => {
    if (!p) return "—"
    if (p === "FACE_TO_FACE") return "Face to Face"
    if (p === "FLEXIBLE") return "Flexible"
    return "Online Meeting"
  }

  const rankings = (mentee?.preferences ?? []) as RankedMentor[]
  const sortedRankings = [...rankings].sort((a, b) => a.rank - b.rank)
  const topPreferences = matchRecord
    ? sortedRankings.filter((r) => r.mentor_id !== matchRecord.mentor?.id).slice(0, 3)
    : sortedRankings.slice(0, 3)

  const getSharedDays = (mentorDays: string[]) =>
    (mentee?.available_days ?? []).filter((d: string) => mentorDays.includes(d))

  const getSharedSlots = (mentorSlots: string[]) =>
    (mentee?.time_slot ?? []).filter((s: string) => mentorSlots.includes(s))

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
              {/* <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-3 text-center min-w-[72px]">
                <p className="text-2xl font-bold">{papers.length}</p>
                <p className="text-xs text-emerald-100">Papers</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-3 text-center min-w-[72px]">
                <p className="text-2xl font-bold">{reviewedCount}</p>
                <p className="text-xs text-emerald-100">Reviewed</p>
              </div> */}
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

        {/* Dashboard */}
        <div className="p-4 sm:p-6 space-y-6">

          {/* Mentor Card - full width */}
          <div className="w-full">
            {matchRecord ? (
              <Card className="w-full border-0 shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
                      <User className="w-4 h-4 text-emerald-600" />
                      Your Recommended Mentor
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
                      {(matchRecord.mentor?.first_name?.[0] ?? "") + (matchRecord.mentor?.last_name?.[0] ?? "")}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold text-slate-900 truncate">
                        {matchRecord.mentor?.first_name} {matchRecord.mentor?.last_name}
                      </h3>
                      <p className="text-sm text-slate-500 truncate">{matchRecord.mentor?.email}</p>
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
                    {matchRecord.matched_keywords && matchRecord.matched_keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {matchRecord.matched_keywords.map((kw: string, i: number) => (
                          <span key={i} className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Match Criteria */}
                  {(() => {
                    const sharedDays = (mentee?.available_days ?? []).filter((d: string) =>
                      (matchRecord.mentor?.available_days ?? []).includes(d))
                    const sharedSlots = (mentee?.time_slot ?? []).filter((s: string) =>
                      (matchRecord.mentor?.time_slot ?? []).includes(s))
                    const commMatch = !!mentee?.communication_preference &&
                      commLabel(mentee.communication_preference) === commLabel(matchRecord.mentor?.communication_preference)
                    return (
                      <div className="border-t border-slate-100 pt-3 space-y-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Match Criteria</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                          <div>
                            <p className="text-slate-400 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" />Shared Days</p>
                            {sharedDays.length > 0
                              ? <div className="flex flex-wrap gap-1">{sharedDays.map((d: string) => <span key={d} className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{d}</span>)}</div>
                              : <span className="text-slate-400 italic">No shared days</span>}
                          </div>
                          <div>
                            <p className="text-slate-400 mb-1 flex items-center gap-1"><MessageSquare className="w-3 h-3" />Communication</p>
                            <span className={`px-2 py-0.5 rounded-full font-medium ${commMatch ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                              {commMatch ? "✓" : "✗"} {commLabel(mentee?.communication_preference)}
                            </span>
                          </div>
                          <div>
                            <p className="text-slate-400 mb-1 flex items-center gap-1"><Clock className="w-3 h-3" />Shared Slots</p>
                            {sharedSlots.length > 0
                              ? <div className="flex flex-wrap gap-1">{sharedSlots.map((s: string) => <span key={s} className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{s}</span>)}</div>
                              : <span className="text-slate-400 italic">No shared slots</span>}
                          </div>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Forte & Skills */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Expertise</p>
                      <div className="flex flex-wrap gap-1">
                        {matchRecord.mentor?.forte && matchRecord.mentor.forte.length > 0 ? (
                          matchRecord.mentor.forte.map((f: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs border-blue-200 text-blue-700 bg-blue-50">
                              {f}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">No expertise listed</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Skills</p>
                      <div className="flex flex-wrap gap-1">
                        {matchRecord.mentor?.technical_skills && matchRecord.mentor.technical_skills.length > 0 ? (
                          matchRecord.mentor.technical_skills.slice(0, 4).map((s: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs border-slate-200 text-slate-600">
                              {s}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">No skills listed</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* About */}
                  {matchRecord.mentor?.self_description && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">About</p>
                      <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
                        {matchRecord.mentor.self_description}
                      </p>
                    </div>
                  )}

                  {/* Prev Theses */}
                  {matchRecord.mentor?.prev_mentored_thesis &&
                    (matchRecord.mentor.prev_mentored_thesis as PrevMentoredThesis[]).length > 0 && (
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
                              {(matchRecord.mentor.prev_mentored_thesis as PrevMentoredThesis[]).map((t, i) => (
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

                  {/* Published Papers */}
                  <div className="mt-6">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Published Papers
                    </p>
                    {matchRecord.mentor?.published_papers && matchRecord.mentor.published_papers.length > 0 ? (
                      <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-50 text-slate-500">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium">Title</th>
                              <th className="px-3 py-2 text-left font-medium">Authors</th>
                              <th className="px-3 py-2 text-left font-medium">Year</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {matchRecord.mentor.published_papers.map((paper: any, i: number) => (
                              <tr key={i} className="hover:bg-slate-50">
                                <td className="px-3 py-2 text-slate-800 font-medium">
                                  {paper.url ? (
                                    <a href={paper.url} target="_blank" rel="noreferrer" className="text-slate-800 hover:text-emerald-600 underline">
                                      {paper.title}
                                    </a>
                                  ) : (
                                    paper.title
                                  )}
                                </td>
                                <td className="px-3 py-2 text-slate-500">
                                  {paper.authors?.join(", ") ?? "—"}
                                </td>
                                <td className="px-3 py-2 text-slate-400">{paper.year ?? "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400">No published papers listed.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="w-full border-0 shadow-sm border-dashed border-2 border-slate-200 bg-white">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
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

            {topPreferences.length > 0 && (
              <Card className="mt-5 w-full border-0 shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    Other Recommended Mentors
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <p className="text-sm text-slate-500">
                    These are the top mentors from your preference list.
                  </p>
                  <div className="grid gap-3">
                    {topPreferences.map((rec) => (
                      <div key={rec.mentor_id} className="border border-slate-200 rounded-2xl p-4 bg-white">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{rec.name}</p>
                            <p className="text-xs text-slate-500">Rank #{rec.rank} · {Math.round(rec.score * 100)}%</p>
                          </div>
                          <Badge className="bg-slate-100 text-slate-700 border-0 text-xs">Ranked</Badge>
                        </div>
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                          <div>
                            <p className="text-slate-400 mb-1 uppercase tracking-wide">Shared Days</p>
                            {getSharedDays(rec.available_days ?? []).length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {getSharedDays(rec.available_days ?? []).map((day: string) => (
                                  <span key={day} className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[11px]">
                                    {day}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">None</span>
                            )}
                          </div>
                          <div>
                            <p className="text-slate-400 mb-1 uppercase tracking-wide">Shared Slots</p>
                            {getSharedSlots(rec.time_slot ?? []).length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {getSharedSlots(rec.time_slot ?? []).map((slot: string) => (
                                  <span key={slot} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[11px]">
                                    {slot}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">None</span>
                            )}
                          </div>
                          <div>
                            <p className="text-slate-400 mb-1 uppercase tracking-wide">Matched Keywords</p>
                            {rec.matched_keywords && rec.matched_keywords.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {rec.matched_keywords.map((kw: string, i: number) => (
                                  <span key={i} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[11px]">
                                    {kw}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">None</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Paper Progress
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
            </Card> */}
          </div>
        </div>
      </div>
    </div>
  );
}