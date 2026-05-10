"use client"
import { useState, useMemo } from "react"
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog, DialogContent, DialogDescription,
    DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Calendar as CalendarIcon, Clock, Plus, RefreshCw, Edit, Sparkles, Users, CheckCircle2, AlertCircle, NotebookPen, Save } from "lucide-react"
import { Matches } from "@/types/menteeTypes"
import { setRecurringMeeting, setRecurringMeetingForAll, updateMeetingNotes } from "@/lib/actions/meetingActions"
import { parseSlot } from "@/components/ui/AvailabilitySelector"
import { useMentor } from "@/app/context/mentorContext"
import type { MeetingRecord } from "@/types/mentorTypes"
import { toast } from "sonner"

type Meeting = MeetingRecord

interface Recommendation {
    day: string
    slot: string
    encoded: string          // "Monday:7:00-8:00"
    coverageCount: number    // how many mentees share this slot
    totalMentees: number
    coveredNames: string[]   // group names of covered mentees
}

type Props = {
    matches: Matches[]
    mentorTimeSlots: string[]
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

// ─── Pure recommender ────────────────────────────────────────────────────────
function computeRecommendations(
    mentorTimeSlots: string[],
    matches: Matches[],
): Recommendation[] {
    const mentees = matches
        .map(m => m.mentee)
        .filter((m): m is NonNullable<typeof m> => !!m?.id)

    if (!mentorTimeSlots.length || !mentees.length) return []

    const recs: Recommendation[] = mentorTimeSlots.map(encoded => {
        const { day, slot } = parseSlot(encoded)
        const covered = mentees.filter(m =>
            (m.time_slot ?? []).includes(encoded)
        )
        return {
            day,
            slot,
            encoded,
            coverageCount: covered.length,
            totalMentees: mentees.length,
            coveredNames: covered.map(m => m.group_name),
        }
    })

    // sort by coverage desc, then day order, then slot asc
    const dayOrder = DAYS.reduce<Record<string, number>>((acc, d, i) => { acc[d] = i; return acc }, {})
    return recs.sort((a, b) =>
        b.coverageCount - a.coverageCount
        || (dayOrder[a.day] ?? 99) - (dayOrder[b.day] ?? 99)
        || a.slot.localeCompare(b.slot)
    ).slice(0, 5)
}

export default function Meeting({ matches = [], mentorTimeSlots = [] }: Props) {
    const { meetings: rawMeetings, meetingsLoading, setMeetings: setContextMeetings } = useMentor()
    const meetings = rawMeetings as Meeting[]
    const setMeetings = setContextMeetings as React.Dispatch<React.SetStateAction<Meeting[]>>

    // per-mentee dialog
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [form, setForm] = useState({
        menteeId: "",
        title: "",
        description: "",
        recurrence_day: "",
        recurrence_time: "",
    })
    const [saving, setSaving] = useState(false)

    // bulk dialog
    const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false)
    const [appliedSlots, setAppliedSlots] = useState<Set<string>>(new Set())
    const [bulkForm, setBulkForm] = useState({
        title: "Weekly Mentoring Session",
        description: "",
        recurrence_day: "",
        recurrence_time: "",
    })
    const [savingBulk, setSavingBulk] = useState(false)

    // meeting notes: keyed by meetingId
    const [notesMap, setNotesMap] = useState<Record<string, string>>({})
    const [savingNotes, setSavingNotes] = useState<Record<string, boolean>>({})

    const handleSaveNotes = async (meetingId: string) => {
        setSavingNotes(prev => ({ ...prev, [meetingId]: true }))
        const result = await updateMeetingNotes(meetingId, notesMap[meetingId] ?? "")
        if (result.success) {
            setMeetings(prev => prev.map(m => m.id === meetingId ? { ...m, notes: notesMap[meetingId] } : m))
            toast.success("Meeting notes saved")
        } else {
            toast.error("Failed to save notes")
        }
        setSavingNotes(prev => ({ ...prev, [meetingId]: false }))
    }

    const recommendations = useMemo(
        () => computeRecommendations(mentorTimeSlots, matches),
        [mentorTimeSlots, matches]
    )

    // ── Per-mentee helpers ──────────────────────────────────────────────────
    const getRecurringMeeting = (menteeId: string) =>
        meetings.find(m => m.mentee_group_id === menteeId && m.is_recurring)

    const openSetMeeting = (menteeId: string) => {
        const existing = getRecurringMeeting(menteeId)
        setForm({
            menteeId,
            title: existing?.title ?? "Weekly Mentoring Session",
            description: existing?.description ?? "",
            recurrence_day: existing?.recurrence_day ?? "",
            recurrence_time: existing?.recurrence_time ?? "",
        })
        setIsDialogOpen(true)
    }

    const handleSave = async () => {
        if (!form.menteeId || !form.title || !form.recurrence_day || !form.recurrence_time) {
            alert("Please fill in all required fields")
            return
        }
        setSaving(true)
        const result = await setRecurringMeeting({
            mentee_group_id: form.menteeId,
            title: form.title,
            description: form.description,
            recurrence_day: form.recurrence_day,
            recurrence_time: form.recurrence_time,
        })
        if (result.success && result.meeting) {
            setMeetings(prev => {
                const exists = prev.some(m => m.mentee_group_id === form.menteeId && m.is_recurring)
                if (exists) {
                    return prev.map(m =>
                        m.mentee_group_id === form.menteeId && m.is_recurring ? { ...m, ...result.meeting } : m
                    )
                }
                return [...prev, result.meeting as Meeting]
            })
            setIsDialogOpen(false)
            setForm({ menteeId: "", title: "", description: "", recurrence_day: "", recurrence_time: "" })
        } else {
            alert("Failed to save meeting schedule")
        }
        setSaving(false)
    }

    // ── Bulk helpers ────────────────────────────────────────────────────────
    const openBulkDialog = (rec?: Recommendation) => {
        setBulkForm({
            title: "Weekly Mentoring Session",
            description: "",
            recurrence_day: rec?.day ?? "",
            recurrence_time: rec?.slot ?? "",
        })
        setIsBulkDialogOpen(true)
    }

    const handleBulkSave = async () => {
        if (!bulkForm.title || !bulkForm.recurrence_day || !bulkForm.recurrence_time) {
            alert("Please fill in all required fields")
            return
        }
        const encoded = `${bulkForm.recurrence_day}:${bulkForm.recurrence_time}`
        const menteeIds = matches
            .filter(m => (m.mentee?.time_slot ?? []).includes(encoded))
            .map(m => m.mentee?.id)
            .filter((id): id is string => !!id)
        if (!menteeIds.length) {
            alert("No mentees are available at this time slot.")
            setSavingBulk(false)
            return
        }

        setSavingBulk(true)
        const result = await setRecurringMeetingForAll({
            mentee_group_ids: menteeIds,
            title: bulkForm.title,
            description: bulkForm.description,
            recurrence_day: bulkForm.recurrence_day,
            recurrence_time: bulkForm.recurrence_time,
        })
        if (result.success) {
            setMeetings(prev => {
                let updated = [...prev]
                for (const r of result.results ?? []) {
                    if (!r.ok || !r.meeting) continue
                    const exists = updated.some(m => m.mentee_group_id === r.id && m.is_recurring)
                    if (exists) {
                        updated = updated.map(m =>
                            m.mentee_group_id === r.id && m.is_recurring ? { ...m, ...r.meeting } : m
                        )
                    } else {
                        updated.push(r.meeting as Meeting)
                    }
                }
                return updated
            })
            setAppliedSlots(prev => new Set([...prev, `${bulkForm.recurrence_day}:${bulkForm.recurrence_time}`]))
            setIsBulkDialogOpen(false)
        } else {
            alert("Some meetings could not be saved. Please try again.")
        }
        setSavingBulk(false)
    }

    // mentees covered at the bulk-selected slot
    const bulkCoveredNames = useMemo(() => {
        if (!bulkForm.recurrence_day || !bulkForm.recurrence_time) return new Set<string>()
        const encoded = `${bulkForm.recurrence_day}:${bulkForm.recurrence_time}`
        return new Set(
            matches
                .filter(m => (m.mentee?.time_slot ?? []).includes(encoded))
                .map(m => m.mentee?.id ?? "")
        )
    }, [bulkForm.recurrence_day, bulkForm.recurrence_time, matches])

    if (meetingsLoading) return <p>Loading meetings...</p>

    return (
        <>
            {/* ── Recommender card ─────────────────────────────────────────── */}
            <Card className="col-span-full border-blue-100">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Sparkles className="w-5 h-5 text-blue-600" />
                        Recommended Weekly Slots
                    </CardTitle>
                    <CardDescription>
                        Ranked by how many of your mentees are available at each time.
                        Pick a slot and apply it to all mentees at once.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {matches.length === 0 ? (
                        <p className="text-sm text-slate-500">No mentees matched yet.</p>
                    ) : mentorTimeSlots.length === 0 ? (
                        <p className="text-sm text-slate-500">
                            You have not set your availability yet. Update your profile to see recommendations.
                        </p>
                    ) : recommendations.filter(rec => !appliedSlots.has(rec.encoded)).length === 0 ? (
                        <p className="text-sm text-slate-500">All recommended slots have been applied.</p>
                    ) : (
                        <div className="space-y-3">
                            {recommendations.filter(rec => !appliedSlots.has(rec.encoded)).map((rec, idx) => {
                                const pct = Math.round((rec.coverageCount / rec.totalMentees) * 100)
                                return (
                                    <div
                                        key={rec.encoded}
                                        className={`flex flex-wrap items-center gap-3 p-3 rounded-lg border ${idx === 0 ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-200"}`}
                                    >
                                        {/* Rank badge */}
                                        {idx === 0 && (
                                            <Badge className="bg-blue-600 text-white text-xs shrink-0">Best</Badge>
                                        )}

                                        {/* Day + time */}
                                        <div className="flex items-center gap-2 min-w-[160px]">
                                            <CalendarIcon className="w-4 h-4 text-slate-500 shrink-0" />
                                            <span className="text-sm font-medium">{rec.day}</span>
                                            <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                                            <span className="text-sm text-slate-600">{rec.slot}</span>
                                        </div>

                                        {/* Coverage bar */}
                                        <div className="flex items-center gap-2 flex-1 min-w-[140px]">
                                            <div className="flex gap-0.5">
                                                {Array.from({ length: rec.totalMentees }).map((_, i) => (
                                                    <div
                                                        key={i}
                                                        className={`h-3 w-4 rounded-sm ${i < rec.coverageCount ? "bg-blue-500" : "bg-slate-200"}`}
                                                    />
                                                ))}
                                            </div>
                                            <span className="text-xs text-slate-600 shrink-0">
                                                {rec.coverageCount}/{rec.totalMentees} mentees
                                            </span>
                                        </div>

                                        {/* Covered group names */}
                                        <div className="flex flex-wrap gap-1 flex-1">
                                            {rec.coveredNames.map(name => (
                                                <Badge key={name} variant="secondary" className="text-xs bg-green-100 text-green-800">
                                                    {name}
                                                </Badge>
                                            ))}
                                        </div>

                                        <Button
                                            size="sm"
                                            onClick={() => openBulkDialog(rec)}
                                            className="bg-blue-600 hover:bg-blue-700 shrink-0"
                                            disabled={rec.coverageCount === 0}
                                        >
                                            <Users className="w-4 h-4 mr-1" /> Apply to Available
                                        </Button>
                                    </div>
                                )
                            })}

                            {/* Manual "Set for All" fallback */}
                            <div className="pt-2 border-t">
                                <Button variant="outline" size="sm" onClick={() => openBulkDialog()}>
                                    <Plus className="w-4 h-4 mr-1" /> Set custom time for all mentees
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── Per-mentee recurring schedule cards ─────────────────────── */}
            {matches.length === 0 ? (
                <Card>
                    <CardContent className="pt-6 text-center text-gray-500">
                        No mentees matched yet.
                    </CardContent>
                </Card>
            ) : (
                matches.map((match) => {
                    const mentee = match.mentee
                    if (!mentee?.id) return null

                    const recurring = getRecurringMeeting(mentee.id)

                    return (
                        <Card key={mentee.id}>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-base">{mentee.group_name}</CardTitle>
                                        <CardDescription>{mentee.research_title}</CardDescription>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant={recurring ? "outline" : "default"}
                                        onClick={() => openSetMeeting(mentee.id!)}
                                        className={recurring ? "" : "bg-blue-600 hover:bg-blue-700"}
                                    >
                                        {recurring
                                            ? <><Edit className="w-4 h-4 mr-1" /> Edit Schedule</>
                                            : <><Plus className="w-4 h-4 mr-1" /> Set Schedule</>
                                        }
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {recurring ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg">
                                            <RefreshCw className="w-5 h-5 text-blue-600 shrink-0" />
                                            <div>
                                                <p className="font-medium text-sm text-blue-900">{recurring.title}</p>
                                                <p className="text-xs text-blue-700">
                                                    Every <strong>{recurring.recurrence_day}</strong> at <strong>{recurring.recurrence_time}</strong>
                                                </p>
                                                {recurring.description && (
                                                    <p className="text-xs text-slate-600 mt-1">{recurring.description}</p>
                                                )}
                                            </div>
                                            <Badge className="ml-auto bg-blue-100 text-blue-800">Recurring</Badge>
                                        </div>
                                        {/* Meeting notes */}
                                        <div className="space-y-2">
                                            <Label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                                                <NotebookPen className="w-3.5 h-3.5" /> Meeting Notes
                                            </Label>
                                            <Textarea
                                                className="text-sm resize-none"
                                                rows={3}
                                                placeholder="Write session notes, action items, or discussion points..."
                                                value={notesMap[recurring.id] ?? recurring.notes ?? ""}
                                                onChange={e => setNotesMap(prev => ({ ...prev, [recurring.id]: e.target.value }))}
                                            />
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="gap-1"
                                                disabled={savingNotes[recurring.id]}
                                                onClick={() => handleSaveNotes(recurring.id)}
                                            >
                                                <Save className="w-3.5 h-3.5" />
                                                {savingNotes[recurring.id] ? "Saving..." : "Save Notes"}
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <p className="text-sm text-gray-500 mb-2">No recurring schedule set yet.</p>
                                        {(() => {
                                            const slots = (mentee.time_slot ?? [])
                                                .map(encoded => { try { return parseSlot(encoded) } catch { return null } })
                                                .filter((s): s is { day: string; slot: string } => !!s)

                                            const byDay = DAYS.map(day => ({
                                                day,
                                                times: slots.filter(s => s.day === day).map(s => s.slot),
                                            })).filter(d => d.times.length > 0)

                                            return byDay.length > 0 ? (
                                                <div className="space-y-1">
                                                    {byDay.map(({ day, times }) => (
                                                        <div key={day} className="flex items-start gap-2 text-xs">
                                                            <span className="font-medium text-slate-600 w-24 shrink-0">{day}</span>
                                                            <div className="flex flex-wrap gap-1">
                                                                {times.map(t => (
                                                                    <Badge key={t} variant="outline" className="text-xs font-normal">
                                                                        {t}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-gray-400">No availability set by mentee.</p>
                                            )
                                        })()}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )
                })
            )}

            {/* ── Per-mentee Set/Edit dialog ───────────────────────────────── */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {getRecurringMeeting(form.menteeId) ? "Edit" : "Set"} Recurring Schedule
                        </DialogTitle>
                        <DialogDescription>
                            This will be the permanent weekly meeting slot for this mentee.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <Label>Meeting Title *</Label>
                            <Input
                                className="mt-2"
                                placeholder="e.g., Weekly Thesis Review"
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                            />
                        </div>

                        <div>
                            <Label>Day *</Label>
                            <Select
                                value={form.recurrence_day}
                                onValueChange={(v) => setForm({ ...form, recurrence_day: v, recurrence_time: "" })}
                            >
                                <SelectTrigger className="mt-2">
                                    <SelectValue placeholder="Select day" />
                                </SelectTrigger>
                                <SelectContent>
                                    {DAYS.map(day => <SelectItem key={day} value={day}>{day}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Time *</Label>
                            <Input
                                type="time"
                                className="mt-2"
                                value={form.recurrence_time}
                                disabled={!form.recurrence_day}
                                onChange={(e) => setForm({ ...form, recurrence_time: e.target.value })}
                            />
                        </div>

                        <div>
                            <Label>Notes (Optional)</Label>
                            <Textarea
                                className="mt-2"
                                placeholder="Agenda, topics to cover, etc."
                                rows={3}
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                            {saving ? "Saving..." : "Save Schedule"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Bulk "Set for All" dialog ────────────────────────────────── */}
            <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-600" />
                            Set Weekly Schedule for All Mentees
                        </DialogTitle>
                        <DialogDescription>
                            This recurring schedule will be applied to every mentee group at once.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <Label>Meeting Title *</Label>
                            <Input
                                className="mt-2"
                                placeholder="e.g., Weekly Thesis Review"
                                value={bulkForm.title}
                                onChange={(e) => setBulkForm({ ...bulkForm, title: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Day *</Label>
                                <Select
                                    value={bulkForm.recurrence_day}
                                    onValueChange={(v) => setBulkForm({ ...bulkForm, recurrence_day: v, recurrence_time: "" })}
                                >
                                    <SelectTrigger className="mt-2">
                                        <SelectValue placeholder="Select day" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {DAYS.map(day => <SelectItem key={day} value={day}>{day}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Time *</Label>
                                {(() => {
                                    // show mentor's time slots for the selected day, fall back to time input
                                    const mentorDaySlots = mentorTimeSlots
                                        .map(e => { try { return parseSlot(e) } catch { return null } })
                                        .filter((s): s is { day: string; slot: string } => !!s && s.day === bulkForm.recurrence_day)
                                    return mentorDaySlots.length > 0 ? (
                                        <Select
                                            value={bulkForm.recurrence_time}
                                            onValueChange={(v) => setBulkForm({ ...bulkForm, recurrence_time: v })}
                                            disabled={!bulkForm.recurrence_day}
                                        >
                                            <SelectTrigger className="mt-2">
                                                <SelectValue placeholder={bulkForm.recurrence_day ? "Select time" : "Select day first"} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {mentorDaySlots.map(s => (
                                                    <SelectItem key={s.slot} value={s.slot}>{s.slot}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Input
                                            type="time"
                                            className="mt-2"
                                            value={bulkForm.recurrence_time}
                                            onChange={(e) => setBulkForm({ ...bulkForm, recurrence_time: e.target.value })}
                                            disabled={!bulkForm.recurrence_day}
                                        />
                                    )
                                })()}
                            </div>
                        </div>

                        <div>
                            <Label>Notes (Optional)</Label>
                            <Textarea
                                className="mt-2"
                                placeholder="Agenda, topics to cover, etc."
                                rows={2}
                                value={bulkForm.description}
                                onChange={(e) => setBulkForm({ ...bulkForm, description: e.target.value })}
                            />
                        </div>

                        {/* Coverage preview */}
                        {bulkForm.recurrence_day && bulkForm.recurrence_time && (
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-slate-700">Mentee coverage at this time:</p>
                                <div className="space-y-1">
                                    {matches.map(match => {
                                        const mentee = match.mentee
                                        if (!mentee?.id) return null
                                        const covered = bulkCoveredNames.has(mentee.id)
                                        return (
                                            <div key={mentee.id} className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${covered ? "bg-green-50" : "bg-amber-50"}`}>
                                                {covered
                                                    ? <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                                                    : <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                                                }
                                                <span className={covered ? "text-green-800" : "text-amber-800"}>
                                                    {mentee.group_name}
                                                </span>
                                                {!covered && (
                                                    <span className="text-xs text-amber-600 ml-auto">
                                                        not in their availability — will still be scheduled
                                                    </span>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBulkDialogOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleBulkSave}
                            disabled={savingBulk || !bulkForm.recurrence_day || !bulkForm.recurrence_time || bulkCoveredNames.size === 0}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {savingBulk ? "Saving..." : `Apply to ${bulkCoveredNames.size} Available Mentee${bulkCoveredNames.size !== 1 ? "s" : ""}`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
