"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Megaphone, Trash2, Plus } from "lucide-react"
import { toast } from "sonner"
import {
    createMentorAnnouncement,
    getMyMentorAnnouncements,
    deleteMentorAnnouncement,
} from "@/lib/actions/mentorAnnouncementActions"
import type { MentorAnnouncement } from "@/types/mentorTypes"

export default function MentorAnnouncements() {
    const [announcements, setAnnouncements] = useState<MentorAnnouncement[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [title, setTitle] = useState("")
    const [body, setBody] = useState("")
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        getMyMentorAnnouncements().then(r => {
            if (r.success) setAnnouncements(r.data)
            setLoading(false)
        })
    }, [])

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim() || !body.trim()) return
        setSubmitting(true)
        const result = await createMentorAnnouncement(title, body)
        if (result.success && result.announcement) {
            setAnnouncements(prev => [result.announcement!, ...prev])
            setTitle("")
            setBody("")
            setShowForm(false)
            toast.success("Announcement posted to your mentees")
        } else {
            toast.error("Failed to post announcement")
        }
        setSubmitting(false)
    }

    const handleDelete = async (id: string) => {
        setAnnouncements(prev => prev.filter(a => a.id !== id))
        const result = await deleteMentorAnnouncement(id)
        if (!result.success) {
            toast.error("Failed to delete announcement")
        }
    }

    return (
        <div className="space-y-5">
            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
                                <Megaphone className="w-4 h-4 text-blue-600" />
                                Announcements to Mentees
                            </CardTitle>
                            <CardDescription className="mt-0.5">
                                Broadcast a message to your matched mentee groups.
                            </CardDescription>
                        </div>
                        <Button
                            size="sm"
                            onClick={() => setShowForm(v => !v)}
                            className="bg-blue-600 hover:bg-blue-700 text-white gap-1"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            New Announcement
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-4">
                    {/* Create form */}
                    {showForm && (
                        <form onSubmit={handleCreate} className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200">
                            <div>
                                <Label className="text-xs font-medium text-slate-600">Title <span className="text-red-400">*</span></Label>
                                <Input
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="e.g. Reminder: submit Chapter 1 draft by Friday"
                                    className="mt-1 text-sm"
                                    required
                                />
                            </div>
                            <div>
                                <Label className="text-xs font-medium text-slate-600">Message <span className="text-red-400">*</span></Label>
                                <Textarea
                                    value={body}
                                    onChange={e => setBody(e.target.value)}
                                    placeholder="Write your announcement here..."
                                    className="mt-1 text-sm resize-none"
                                    rows={3}
                                    required
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button type="submit" size="sm" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white">
                                    {submitting ? "Posting..." : "Post Announcement"}
                                </Button>
                                <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    )}

                    {/* Announcement list */}
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}
                        </div>
                    ) : announcements.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <Megaphone className="w-9 h-9 mx-auto mb-2 text-slate-200" />
                            <p className="text-sm">No announcements yet. Post one to notify your mentees.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {announcements.map(a => (
                                <div key={a.id} className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                                    <Megaphone className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-blue-900">{a.title}</p>
                                        <p className="text-sm text-blue-700 mt-0.5 whitespace-pre-wrap">{a.body}</p>
                                        <p className="text-xs text-blue-400 mt-1">
                                            {new Date(a.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(a.id)}
                                        className="shrink-0 text-blue-300 hover:text-red-400 transition-colors mt-0.5"
                                        aria-label="Delete announcement"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
